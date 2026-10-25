import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	Contest,
	CreateGameResponse,
	CustomMission,
	Game,
	GameEvent,
	JoinResponse,
	Me,
	Player,
	PendingKill,
	PlayerStatus,
	ServerToClientEvents,
} from "shared";
import { db } from "./db.ts";
import { DEFAULT_MISSIONS } from "./missions.ts";
import { drawCycle, drawMissions } from "./draw.ts";
import { inTransaction } from "./schema.ts";
import {
	autoValidateExpiredKills,
	changeMission,
	contestKill,
	declareKill,
	endGame,
	getKill,
	getResults,
	leaveGame,
	MAX_MISSION_CHANGES,
	rejectKill,
	validateKill,
	whyCannotDeclareKill,
} from "./kills.ts";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3000;
const io = new Server<Record<string, never>, ServerToClientEvents>(httpServer);

io.on("connection", (socket) => {
	socket.emit("players", listPlayers());
	socket.emit("game", getGame());
});

app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (request, response) => {
	response.json({ ok: true });
});

function getGame(): Game | null {
	const row = db
		.prepare(
			`SELECT name, orga_name, status, auto_validate_minutes, started_at, ended_at, ends_at
			 FROM game WHERE id = 1`,
		)
		.get() as
		| {
				name: string;
				orga_name: string;
				status: Game["status"];
				auto_validate_minutes: number;
				started_at: number | null;
				ended_at: number | null;
				ends_at: number | null;
		  }
		| undefined;

	if (!row) return null;
	return {
		name: row.name,
		orgaName: row.orga_name,
		status: row.status,
		autoValidateMinutes: row.auto_validate_minutes,
		startedAt: row.started_at,
		endedAt: row.ended_at,
		endsAt: row.ends_at,
	};
}

function getMe(token: string): Me | null {
	const row = db
		.prepare(
			`SELECT p.id, p.name, p.status, p.mission_changes,
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
				mission_changes: number;
				target_id: number | null;
				target_name: string | null;
				mission: string | null;
		  }
		| undefined;

	if (!row) return null;

	const killCount = (
		db
			.prepare(
				"SELECT COUNT(*) AS n FROM kills WHERE chasseur_id = ? AND status = 'VALIDE'",
			)
			.get(row.id) as { n: number }
	).n;
	const killer = db
		.prepare(
			`SELECT c.name FROM kills k JOIN players c ON c.id = k.chasseur_id
			 WHERE k.victime_id = ? AND k.status = 'VALIDE'`,
		)
		.get(row.id) as { name: string } | undefined;

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
		killCount,
		canChangeMission: alive && row.mission_changes < MAX_MISSION_CHANGES,
		huntingKill: alive ? pendingKill("chasseur_id", row.id) : null,
		victimKill: alive ? victimKill(row.id) : null,
		eliminatedBy: killer?.name ?? null,
		gameCode: gameCode(),
	};
}

function pendingKill(
	column: "chasseur_id" | "victime_id",
	playerId: number,
): PendingKill | null {
	const row = db
		.prepare(
			`SELECT id, status, declared_at FROM kills
			 WHERE ${column} = ? AND status IN ('EN_ATTENTE', 'CONTESTE')`,
		)
		.get(playerId) as
		| { id: number; status: PendingKill["status"]; declared_at: number }
		| undefined;
	return row
		? { id: row.id, status: row.status, declaredAt: row.declared_at }
		: null;
}

function victimKill(playerId: number): Me["victimKill"] {
	const kill = pendingKill("victime_id", playerId);
	if (!kill) return null;
	const row = db
		.prepare(
			`SELECT players.name FROM kills
			 JOIN players ON players.id = kills.chasseur_id
			 WHERE kills.id = ?`,
		)
		.get(kill.id) as { name: string };
	return { ...kill, chasseurName: row.name };
}

function broadcastChange() {
	io.emit("players", listPlayers());
	io.emit("game", getGame());
	io.emit("refresh");
}

function listPlayers(): Player[] {
	return db
		.prepare("SELECT id, name, status FROM players ORDER BY joined_at")
		.all() as unknown as Player[];
}

// Les actions orga envoient le code secret dans l'en-tête X-Orga-Code.
function isOrga(request: express.Request): boolean {
	return isOrgaCode(request.get("X-Orga-Code"));
}

const PHOTO_PREFIX = "data:image/jpeg;base64,";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length: number): string {
	let code = "";
	for (let i = 0; i < length; i++) {
		code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
	}
	return code;
}

function gameCode(): string {
	const row = db.prepare("SELECT code FROM game WHERE id = 1").get() as
		| { code: string }
		| undefined;
	return row?.code ?? "";
}

function isValidPhoto(photo: unknown): photo is string | null {
	return (
		photo === null ||
		(typeof photo === "string" &&
			photo.startsWith(PHOTO_PREFIX) &&
			photo.length <= 500_000)
	);
}

function isNameTaken(error: unknown): boolean {
	return error instanceof Error && error.message.includes("UNIQUE");
}

function insertPlayer(name: string, photo: string | null): string {
	const token = randomUUID();
	db.prepare(
		"INSERT INTO players (name, token, photo, joined_at) VALUES (?, ?, ?, ?)",
	).run(name, token, photo, Date.now());
	return token;
}

function isGameCode(code: unknown): boolean {
	const expected = gameCode();
	return (
		expected !== "" &&
		typeof code === "string" &&
		code.trim().toUpperCase() === expected
	);
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
	const body = request.body ?? {};
	const name = String(body.name ?? "").trim();
	const orgaName = String(body.orgaName ?? "").trim();
	const endsAt = body.endsAt ?? null;
	const participant = body.participant === true;
	const playerName = String(body.playerName ?? "").trim();
	const photo = body.photo ?? null;

	if (name.length === 0 || name.length > 40) {
		response
			.status(400)
			.json({ error: "Le nom de la partie doit faire entre 1 et 40 caractères." });
		return;
	}
	if (orgaName.length === 0 || orgaName.length > 30) {
		response
			.status(400)
			.json({ error: "Ton nom doit faire entre 1 et 30 caractères." });
		return;
	}
	if (endsAt !== null && (typeof endsAt !== "number" || endsAt <= Date.now())) {
		response.status(400).json({ error: "L'heure de fin doit être à venir." });
		return;
	}
	if (participant && (playerName.length === 0 || playerName.length > 30)) {
		response
			.status(400)
			.json({ error: "Ton nom de joueur doit faire entre 1 et 30 caractères." });
		return;
	}
	if (participant && !isValidPhoto(photo)) {
		response.status(400).json({ error: "Photo invalide." });
		return;
	}

	const customMissions: string[] =
		!participant && Array.isArray(body.missions)
			? body.missions
					.map((mission: unknown) => String(mission).trim())
					.filter((mission: string) => mission.length > 0)
			: [];
	if (customMissions.some((mission) => mission.length > 200)) {
		response
			.status(400)
			.json({ error: "Une mission doit faire entre 1 et 200 caractères." });
		return;
	}
	if (getGame()) {
		response.status(409).json({ error: "Une partie existe déjà." });
		return;
	}

	const orgaCode = generateCode(6);
	let token: string | null = null;
	inTransaction(db, () => {
		db.prepare(
			`INSERT INTO game (id, orga_code, code, name, orga_name, ends_at, orga_plays)
			 VALUES (1, ?, ?, ?, ?, ?, ?)`,
		).run(orgaCode, generateCode(4), name, orgaName, endsAt, participant ? 1 : 0);

		const insertMission = db.prepare(
			"INSERT INTO missions (text, custom) VALUES (?, ?)",
		);
		for (const text of DEFAULT_MISSIONS) {
			insertMission.run(text, 0);
		}
		for (const text of customMissions) {
			insertMission.run(text, 1);
		}

		if (participant) {
			token = insertPlayer(playerName, photo);
		}
	});

	io.emit("game", getGame());
	io.emit("players", listPlayers());
	// Visible seulement dans les logs du serveur : permet de retrouver un code orga perdu.
	console.log(`Partie créée : « ${name} », code orga ${orgaCode}`);

	const result: CreateGameResponse = {
		orgaCode,
		player: token ? { token, me: getMe(token)! } : null,
	};
	response.status(201).json(result);
});

app.get("/api/players/:id/photo", (request, response) => {
	const row = db
		.prepare("SELECT photo FROM players WHERE id = ?")
		.get(Number(request.params.id)) as { photo: string | null } | undefined;
	if (!row?.photo) {
		response.status(404).end();
		return;
	}
	response
		.type("jpeg")
		.set("Cache-Control", "no-cache")
		.send(Buffer.from(row.photo.slice(PHOTO_PREFIX.length), "base64"));
});

app.post("/api/game/check", (request, response) => {
	if (!isGameCode(request.body?.code)) {
		response.status(404).json({ error: "Aucune partie avec ce code." });
		return;
	}
	if (getGame()?.status !== "LOBBY") {
		response.status(409).json({ error: "La partie a déjà commencé." });
		return;
	}
	response.status(204).end();
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

	if (!isGameCode(request.body?.code)) {
		response.status(403).json({ error: "Code de partie incorrect." });
		return;
	}
	const game = getGame();
	if (!game || game.status !== "LOBBY") {
		response
			.status(409)
			.json({ error: "La partie n'accepte pas de nouveaux joueurs." });
		return;
	}

	const photo = request.body?.photo ?? null;
	if (!isValidPhoto(photo)) {
		response.status(400).json({ error: "Photo invalide." });
		return;
	}

	let token: string;
	try {
		token = insertPlayer(name, photo);
	} catch (error) {
		// La colonne name est UNIQUE : SQLite refuse un nom déjà pris.
		if (isNameTaken(error)) {
			response.status(409).json({
				error: "Ce nom est déjà utilisé par un joueur, rajoute tes initiales",
			});
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
	if (!isOrga(request)) {
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
	inTransaction(db, () => {
		for (const playerId of playerIds) {
			assign.run(targets.get(playerId)!, missions.get(playerId)!, playerId);
		}
		db.prepare(
			"UPDATE game SET status = 'EN_COURS', started_at = ? WHERE id = 1",
		).run(Date.now());
	});

	// Chaque téléphone apprend que la partie a commencé, puis demande SES infos via /api/me.
	io.emit("game", getGame());
	response.json(getGame());
});

// Le chasseur déclare avoir tué sa cible.
app.post("/api/kills", (request, response) => {
	const token = tokenFrom(request);
	const me = token ? getMe(token) : null;
	if (!me) {
		response.status(401).json({ error: "Joueur inconnu." });
		return;
	}
	if (getGame()?.status !== "EN_COURS") {
		response.status(409).json({ error: "La partie n'est pas en cours." });
		return;
	}
	const reason = whyCannotDeclareKill(db, me.id);
	if (reason) {
		response.status(409).json({ error: reason });
		return;
	}

	declareKill(db, me.id, Date.now());
	broadcastChange();
	response.status(201).json(getMe(token!));
});

// La victime répond : « Je me suis fait avoir » (confirm) ou « Contester » (contest).
app.post("/api/kills/:id/:action", (request, response) => {
	const token = tokenFrom(request);
	const me = token ? getMe(token) : null;
	const kill = getKill(db, Number(request.params.id));
	const { action } = request.params;

	if (!me || !kill || kill.victime_id !== me.id) {
		response.status(404).json({ error: "Kill introuvable." });
		return;
	}
	if (kill.status !== "EN_ATTENTE") {
		response.status(409).json({ error: "Ce kill a déjà reçu une réponse." });
		return;
	}

	if (action === "confirm") {
		validateKill(db, kill.id, Date.now());
	} else if (action === "contest") {
		contestKill(db, kill.id);
	} else {
		response.status(404).json({ error: "Action inconnue." });
		return;
	}

	broadcastChange();
	response.json(getMe(token!));
});

// Le joueur échange sa mission contre une autre (nombre de fois limité).
app.post("/api/me/mission", (request, response) => {
	const token = tokenFrom(request);
	const me = token ? getMe(token) : null;
	if (!me) {
		response.status(401).json({ error: "Joueur inconnu." });
		return;
	}
	if (getGame()?.status !== "EN_COURS") {
		response.status(409).json({ error: "La partie n'est pas en cours." });
		return;
	}
	try {
		changeMission(db, me.id);
	} catch (err) {
		response.status(409).json({ error: (err as Error).message });
		return;
	}
	response.json(getMe(token!));
});

app.post("/api/me/leave", (request, response) => {
	const token = tokenFrom(request);
	const me = token ? getMe(token) : null;
	if (!me) {
		response.status(401).json({ error: "Joueur inconnu." });
		return;
	}
	if (getGame()?.status !== "EN_COURS" || me.status !== "VIVANT") {
		response.status(409).json({ error: "Tu ne peux pas quitter la partie." });
		return;
	}

	leaveGame(db, me.id, Date.now());
	broadcastChange();
	response.json(getMe(token!));
});

// L'orga vérifie son code avant d'accéder à son espace.
app.get("/api/orga/code", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	response.json({ code: gameCode() });
});

function listCustomMissions(): CustomMission[] {
	return db
		.prepare("SELECT id, text FROM missions WHERE custom = 1 ORDER BY id")
		.all() as unknown as CustomMission[];
}

app.get("/api/orga/missions", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	response.json(listCustomMissions());
});

app.post("/api/orga/missions", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "LOBBY") {
		response.status(409).json({ error: "La partie a déjà commencé." });
		return;
	}
	const text = String(request.body?.text ?? "").trim();
	if (text.length === 0 || text.length > 200) {
		response
			.status(400)
			.json({ error: "Une mission doit faire entre 1 et 200 caractères." });
		return;
	}
	db.prepare("INSERT INTO missions (text, custom) VALUES (?, 1)").run(text);
	response.status(201).json(listCustomMissions());
});

app.delete("/api/orga/missions/:id", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "LOBBY") {
		response.status(409).json({ error: "La partie a déjà commencé." });
		return;
	}
	db.prepare("DELETE FROM missions WHERE id = ? AND custom = 1").run(
		Number(request.params.id),
	);
	response.json(listCustomMissions());
});

app.post("/api/orga/login", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	response.status(204).end();
});

// Les kills contestés, que l'orga doit trancher.
app.get("/api/orga/contests", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	const contests = db
		.prepare(
			`SELECT k.id AS killId, c.id AS chasseurId, c.name AS chasseurName,
			        v.id AS victimeId, v.name AS victimeName, m.text AS mission
			 FROM kills k
			 JOIN players c ON c.id = k.chasseur_id
			 JOIN players v ON v.id = k.victime_id
			 JOIN missions m ON m.id = k.mission_id
			 WHERE k.status = 'CONTESTE'
			 ORDER BY k.declared_at`,
		)
		.all() as unknown as Contest[];
	response.json(contests);
});

app.get("/api/orga/events", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	const { orga_plays } = db
		.prepare("SELECT orga_plays FROM game WHERE id = 1")
		.get() as { orga_plays: number };
	if (orga_plays) {
		response
			.status(403)
			.json({ error: "Le fil est masqué quand l'organisateur joue." });
		return;
	}
	const events = db
		.prepare(
			`SELECT k.id AS killId, c.id AS chasseurId, c.name AS chasseurName,
			        v.id AS victimeId, v.name AS victimeName, m.text AS mission,
			        k.resolved_at AS resolvedAt
			 FROM kills k
			 JOIN players c ON c.id = k.chasseur_id
			 JOIN players v ON v.id = k.victime_id
			 JOIN missions m ON m.id = k.mission_id
			 WHERE k.status = 'VALIDE'
			 ORDER BY k.resolved_at DESC`,
		)
		.all() as unknown as GameEvent[];
	response.json(events);
});

app.post("/api/orga/ends-at", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	const endsAt = request.body?.endsAt ?? null;
	if (endsAt !== null && (typeof endsAt !== "number" || endsAt <= Date.now())) {
		response.status(400).json({ error: "L'heure de fin doit être à venir." });
		return;
	}
	if (getGame()?.status === "TERMINEE") {
		response.status(409).json({ error: "La partie est terminée." });
		return;
	}
	db.prepare("UPDATE game SET ends_at = ? WHERE id = 1").run(endsAt);
	io.emit("game", getGame());
	response.status(204).end();
});

app.post("/api/orga/players/:id/remove", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "EN_COURS") {
		response.status(409).json({ error: "La partie n'est pas en cours." });
		return;
	}
	try {
		leaveGame(db, Number(request.params.id), Date.now());
	} catch {
		response.status(409).json({ error: "Ce joueur n'est plus en jeu." });
		return;
	}
	broadcastChange();
	response.status(204).end();
});

// L'orga tranche une contestation : accept (kill validé) ou reject (kill annulé).
app.post("/api/orga/kills/:id/:decision", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	const kill = getKill(db, Number(request.params.id));
	if (kill?.status !== "CONTESTE") {
		response.status(409).json({ error: "Ce kill n'est plus contesté." });
		return;
	}

	const { decision } = request.params;
	if (decision === "accept") {
		validateKill(db, kill.id, Date.now());
	} else if (decision === "reject") {
		rejectKill(db, kill.id, Date.now());
	} else {
		response.status(404).json({ error: "Décision inconnue." });
		return;
	}

	broadcastChange();
	response.status(204).end();
});

app.post("/api/orga/end", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "EN_COURS") {
		response.status(409).json({ error: "La partie n'est pas en cours." });
		return;
	}
	endGame(db, Date.now());
	broadcastChange();
	response.status(204).end();
});

// Une fois la partie terminée, l'orga efface tout pour pouvoir en recréer une.
app.post("/api/orga/reset", (request, response) => {
	if (!isOrga(request)) {
		response.status(403).json({ error: "Code orga incorrect." });
		return;
	}
	if (getGame()?.status !== "TERMINEE") {
		response.status(409).json({ error: "La partie n'est pas terminée." });
		return;
	}
	inTransaction(db, () => {
		db.exec("DELETE FROM kills");
		db.exec("DELETE FROM players");
		db.exec("DELETE FROM missions");
		db.exec("DELETE FROM game");
	});
	broadcastChange();
	response.status(204).end();
});

app.get("/api/results", (request, response) => {
	if (getGame()?.status !== "TERMINEE") {
		response.status(409).json({ error: "La partie n'est pas terminée." });
		return;
	}
	response.json(getResults(db));
});

// Toutes les 10 secondes, le serveur valide les kills restés sans réponse trop longtemps.
// C'est le serveur qui s'en charge : ça marche même si le téléphone de la victime est éteint.
setInterval(() => {
	const now = Date.now();
	const game = getGame();
	if (game?.status === "EN_COURS" && game.endsAt !== null && now >= game.endsAt) {
		endGame(db, now);
		broadcastChange();
		return;
	}
	if (autoValidateExpiredKills(db, now) > 0) {
		broadcastChange();
	}
}, 10_000);

// En prod, le serveur sert aussi le front buildé (même domaine : pas de CORS).
// Toute route inconnue renvoie index.html pour que le front gère la navigation.
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
app.use(express.static(webDist));
app.get("/{*splat}", (request, response) => {
	response.sendFile(join(webDist, "index.html"));
});

httpServer.listen(port, () => {
	console.log(`Serveur prêt sur http://localhost:${port}`);
	const current = db.prepare("SELECT name, orga_code FROM game WHERE id = 1").get() as
		| { name: string; orga_code: string }
		| undefined;
	if (current) {
		console.log(`Partie en cours : « ${current.name} », code orga ${current.orga_code}`);
	}
});
