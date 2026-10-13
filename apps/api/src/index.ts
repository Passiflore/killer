import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type {
	Game,
	JoinResponse,
	Me,
	Player,
	PlayerStatus,
	ServerToClientEvents,
} from "shared";
import { db } from "./db.ts";
import { DEFAULT_MISSIONS } from "./missions.ts";
import { drawCycle, drawMissions } from "./draw.ts";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3000;
const io = new Server<Record<string, never>, ServerToClientEvents>(httpServer);

io.on("connection", (socket) => {
	socket.emit("players", listPlayers());
	socket.emit("game", getGame());
});

app.use(express.json());

app.get("/healthz", (request, response) => {
	response.json({ ok: true });
});

function getGame(): Game | null {
	const row = db
		.prepare(
			"SELECT status, auto_validate_minutes, started_at, ended_at FROM game WHERE id = 1",
		)
		.get() as
		| {
				status: Game["status"];
				auto_validate_minutes: number;
				started_at: number | null;
				ended_at: number | null;
		  }
		| undefined;

	if (!row) return null;
	return {
		status: row.status,
		autoValidateMinutes: row.auto_validate_minutes,
		startedAt: row.started_at,
		endedAt: row.ended_at,
	};
}

function getMe(token: string): Me | null {
	const row = db
		.prepare(
			`SELECT p.id, p.name, p.status,
			        t.id AS target_id, t.name AS target_name,
			        m.text AS mission
			 FROM players p
			 LEFT JOIN players t ON t.id = p.target_id
			 LEFT JOIN missions m ON m.id = p.mission_id
			 WHERE p.token = ?`,
		)
		.get(token) as
		| {
				id: number;
				name: string;
				status: PlayerStatus;
				target_id: number | null;
				target_name: string | null;
				mission: string | null;
		  }
		| undefined;

	if (!row) return null;

	const alive = row.status === "VIVANT";
	return {
		id: row.id,
		name: row.name,
		status: row.status,
		target:
			alive && row.target_id !== null && row.target_name !== null
				? { id: row.target_id, name: row.target_name }
				: null,
		mission: alive ? row.mission : null,
	};
}

function listPlayers(): Player[] {
	return db
		.prepare("SELECT id, name, status FROM players ORDER BY joined_at")
		.all() as unknown as Player[];
}

function isOrgaCode(code: unknown): boolean {
	const row = db.prepare("SELECT orga_code FROM game WHERE id = 1").get() as
		| { orga_code: string }
		| undefined;
	return row !== undefined && code === row.orga_code;
}

function tokenFrom(request: express.Request): string | null {
	const header = request.headers.authorization;
	if (!header?.startsWith("Bearer ")) return null;
	return header.slice("Bearer ".length);
}

// --- Routes ----------------------------------------------------------------

app.get("/api/game", (request, response) => {
	response.json(getGame());
});

// L'organisateur crée la partie et choisit son code secret.
app.post("/api/game", (request, response) => {
	const orgaCode = String(request.body?.orgaCode ?? "").trim();
	if (orgaCode.length < 4) {
		response
			.status(400)
			.json({ error: "Le code orga doit faire au moins 4 caractères." });
		return;
	}
	if (getGame()) {
		response.status(409).json({ error: "Une partie existe déjà." });
		return;
	}

	db.prepare("INSERT INTO game (id, orga_code) VALUES (1, ?)").run(orgaCode);

	const insertMission = db.prepare("INSERT INTO missions (text) VALUES (?)");
	for (const text of DEFAULT_MISSIONS) {
		insertMission.run(text);
	}

	response.status(201).json(getGame());
});

// Un joueur rejoint la partie avec un nom.
app.post("/api/players", (request, response) => {
	const name = String(request.body?.name ?? "").trim();
	if (name.length === 0 || name.length > 30) {
		response
			.status(400)
			.json({ error: "Ton nom doit faire entre 1 et 30 caractères." });
		return;
	}

	const game = getGame();
	if (!game || game.status !== "LOBBY") {
		response
			.status(409)
			.json({ error: "La partie n'accepte pas de nouveaux joueurs." });
		return;
	}

	const token = randomUUID();
	try {
		db.prepare(
			"INSERT INTO players (name, token, joined_at) VALUES (?, ?, ?)",
		).run(name, token, Date.now());
	} catch (error) {
		// La colonne name est UNIQUE : SQLite refuse un nom déjà pris.
		if (error instanceof Error && error.message.includes("UNIQUE")) {
			response.status(409).json({ error: "Ce nom est déjà pris." });
			return;
		}
		throw error;
	}

	// Prévenir tous les téléphones connectés qu'un joueur est arrivé.
	io.emit("players", listPlayers());

	const body: JoinResponse = { token, me: getMe(token)! };
	response.status(201).json(body);
});

// « Qui suis-je ? » : le téléphone envoie son token, le serveur répond avec SES infos.
app.get("/api/me", (request, response) => {
	const token = tokenFrom(request);
	const me = token ? getMe(token) : null;
	if (!me) {
		response.status(401).json({ error: "Joueur inconnu." });
		return;
	}
	response.json(me);
});

// L'orga lance la partie : tirage des cibles et des missions, puis passage EN_COURS.
app.post("/api/game/start", (request, response) => {
	if (!isOrgaCode(request.body?.orgaCode)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "LOBBY") {
		response.status(409).json({ error: "La partie est déjà lancée." });
		return;
	}

	const playerIds = listPlayers().map((player) => player.id);
	if (playerIds.length < 2) {
		response
			.status(409)
			.json({ error: "Il faut au moins 2 joueurs pour lancer la partie." });
		return;
	}

	const missionIds = (
		db.prepare("SELECT id FROM missions").all() as unknown as { id: number }[]
	).map((mission) => mission.id);

	const targets = drawCycle(playerIds);
	const missions = drawMissions(playerIds, missionIds);

	// Transaction : soit tout est écrit, soit rien (pas de partie à moitié lancée).
	const assign = db.prepare(
		"UPDATE players SET target_id = ?, mission_id = ? WHERE id = ?",
	);
	db.exec("BEGIN");
	try {
		for (const playerId of playerIds) {
			assign.run(targets.get(playerId)!, missions.get(playerId)!, playerId);
		}
		db.prepare(
			"UPDATE game SET status = 'EN_COURS', started_at = ? WHERE id = 1",
		).run(Date.now());
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}

	// Chaque téléphone apprend que la partie a commencé, puis demande SES infos via /api/me.
	io.emit("game", getGame());
	response.json(getGame());
});

httpServer.listen(port, () => {
	console.log(`Serveur prêt sur http://localhost:${port}`);
});
