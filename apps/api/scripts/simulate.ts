// Simule une partie complète contre un vrai serveur, lancé sur une base jetable.
// Lancer : pnpm --filter api simulate
//
// Les tests unitaires (src/*.test.ts) vérifient kills.ts et draw.ts un par un.
// Ce script passe par les routes HTTP, dans l'ordre d'une vraie soirée, pour
// attraper les bugs « de colle » entre les morceaux (statuts, tokens, droits orga).

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type {
	Contest,
	CreateGameResponse,
	Game,
	GameEvent,
	JoinResponse,
	Me,
	Results,
} from "shared";

const port = Number(process.env.SIMULATE_PORT) || 3999;
const baseUrl = `http://localhost:${port}`;
const tmpDir = mkdtempSync(join(tmpdir(), "killer-simulate-"));
const dbPath = join(tmpDir, "simulate.db");
const apiDir = fileURLToPath(new URL("..", import.meta.url));

// --- Outils ------------------------------------------------------------------

let orgaCode = "";
const tokens = new Map<number, string>(); // id du joueur → son token

function step(title: string) {
	console.log(`\n▶ ${title}`);
}

function ok(message: string) {
	console.log(`  ✓ ${message}`);
}

async function call(
	method: "GET" | "POST",
	path: string,
	options: { token?: string; orga?: boolean; body?: unknown } = {},
): Promise<{ status: number; data: unknown }> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (options.token) headers.Authorization = `Bearer ${options.token}`;
	if (options.orga) headers["X-Orga-Code"] = orgaCode;
	const response = await fetch(baseUrl + path, {
		method,
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});
	const text = await response.text();
	return { status: response.status, data: text ? JSON.parse(text) : null };
}

// Appelle la route et vérifie le code HTTP attendu.
async function expect(
	status: number,
	method: "GET" | "POST",
	path: string,
	options: { token?: string; orga?: boolean; body?: unknown } = {},
): Promise<unknown> {
	const result = await call(method, path, options);
	assert.equal(
		result.status,
		status,
		`${method} ${path} : attendu ${status}, reçu ${result.status} ${JSON.stringify(result.data)}`,
	);
	return result.data;
}

async function me(playerId: number): Promise<Me> {
	return (await expect(200, "GET", "/api/me", { token: tokens.get(playerId) })) as Me;
}

// Lecture directe de la base : l'API ne renvoie jamais la table entière (c'est voulu).
function readPlayers() {
	const db = new DatabaseSync(dbPath, { readOnly: true });
	const rows = db
		.prepare("SELECT id, name, status, target_id, mission_id FROM players")
		.all() as {
		id: number;
		name: string;
		status: string;
		target_id: number | null;
		mission_id: number | null;
	}[];
	db.close();
	return rows;
}

// Invariant : les vivants forment UN seul cycle, sans trou ; les éliminés n'ont plus rien.
function checkCycle() {
	const players = readPlayers();
	const alive = players.filter((player) => player.status === "VIVANT");
	for (const player of players.filter((p) => p.status === "ELIMINE")) {
		assert.equal(player.target_id, null, `${player.name} éliminé a encore une cible`);
		assert.equal(player.mission_id, null, `${player.name} éliminé a encore une mission`);
	}
	if (alive.length < 2) return;

	const targetOf = new Map(alive.map((player) => [player.id, player.target_id]));
	const seen = new Set<number>();
	let current = alive[0].id;
	while (!seen.has(current)) {
		seen.add(current);
		const next = targetOf.get(current);
		assert.ok(next != null && targetOf.has(next), "une cible pointe vers un joueur mort");
		current = next;
	}
	assert.equal(current, alive[0].id, "le cycle ne revient pas au départ");
	assert.equal(seen.size, alive.length, "certains vivants sont hors du cycle");
	ok(`cycle unique de ${alive.length} joueurs vivants`);
}

// Le chasseur d'un joueur = celui qui l'a pour cible.
async function hunterOf(playerId: number): Promise<number> {
	for (const id of tokens.keys()) {
		const player = await me(id);
		if (player.status === "VIVANT" && player.target?.id === playerId) return id;
	}
	throw new Error(`Aucun chasseur pour ${playerId}`);
}

async function firstAlive(): Promise<Me> {
	for (const id of tokens.keys()) {
		const player = await me(id);
		if (player.status === "VIVANT") return player;
	}
	throw new Error("Plus personne en vie");
}

async function declareKill(hunterId: number): Promise<{ killId: number; victimId: number }> {
	const hunter = (await expect(201, "POST", "/api/kills", {
		token: tokens.get(hunterId),
	})) as Me;
	assert.ok(hunter.huntingKill, "le kill déclaré n'apparaît pas côté chasseur");
	return { killId: hunter.huntingKill.id, victimId: hunter.target!.id };
}

// --- Serveur -----------------------------------------------------------------

const server = spawn(process.execPath, ["src/index.ts"], {
	cwd: apiDir,
	env: { ...process.env, PORT: String(port), DB_PATH: dbPath },
	stdio: ["ignore", "pipe", "pipe"],
});
let serverLogs = "";
server.stdout.on("data", (chunk) => (serverLogs += chunk));
server.stderr.on("data", (chunk) => (serverLogs += chunk));

async function waitForServer() {
	for (let i = 0; i < 50; i++) {
		try {
			if ((await fetch(`${baseUrl}/healthz`)).ok) return;
		} catch {
			// Pas encore prêt.
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("Le serveur n'a pas démarré");
}

// --- Scénario ----------------------------------------------------------------

async function simulate() {
	await waitForServer();

	step("Création de la partie (orga non participant)");
	const created = (await expect(201, "POST", "/api/game", {
		body: {
			name: "Simulation",
			orgaName: "Orga",
			participant: false,
			missions: ["Fais-lui dire « simulation »."],
			autoValidateMinutes: 10,
		},
	})) as CreateGameResponse;
	orgaCode = created.orgaCode;
	await expect(409, "POST", "/api/game", { body: { name: "Bis", orgaName: "Orga" } });
	const { code } = (await expect(200, "GET", "/api/orga/code", { orga: true })) as {
		code: string;
	};
	await expect(403, "GET", "/api/orga/code");
	ok(`partie créée, code ${code}, une seule partie à la fois`);

	step("Les joueurs rejoignent");
	await expect(204, "POST", "/api/game/check", { body: { code: code.toLowerCase() } });
	await expect(404, "POST", "/api/game/check", { body: { code: "ZZZZ" } });
	for (const name of ["Alice", "Bastien", "Chloé", "David", "Emma", "Farid"]) {
		const joined = (await expect(201, "POST", "/api/players", {
			body: { name, code, photo: null },
		})) as JoinResponse;
		tokens.set(joined.me.id, joined.token);
	}
	await expect(409, "POST", "/api/players", { body: { name: "alice", code, photo: null } });
	await expect(403, "POST", "/api/players", { body: { name: "Gaston", code: "ZZZZ" } });
	ok("6 joueurs, nom en double refusé (même en minuscules), mauvais code refusé");

	step("Lancement");
	await expect(403, "POST", "/api/game/start");
	await expect(200, "POST", "/api/game/start", { orga: true });
	await expect(409, "POST", "/api/players", { body: { name: "Retard", code, photo: null } });
	for (const id of tokens.keys()) {
		const player = await me(id);
		assert.ok(player.target && player.mission, `${player.name} n'a pas de cible ou de mission`);
	}
	checkCycle();
	ok("plus personne ne peut rejoindre, chacun a une cible et une mission");

	step("Kill confirmé par la victime");
	const alice = await firstAlive();
	const firstKill = await declareKill(alice.id);
	const victimBefore = await me(firstKill.victimId);
	assert.equal(victimBefore.victimKill?.chasseurName, alice.name);

	// Règle 4.5 : personne d'impliqué ne peut déclarer pendant ce kill.
	await expect(409, "POST", "/api/kills", { token: tokens.get(alice.id) });
	await expect(409, "POST", "/api/kills", { token: tokens.get(firstKill.victimId) });
	await expect(409, "POST", "/api/kills", { token: tokens.get(await hunterOf(alice.id)) });
	await expect(409, "POST", "/api/me/mission", { token: tokens.get(alice.id) });
	ok("règle 4.5 : chasseur, victime et chasseur du chasseur bloqués ; mission figée");

	await expect(404, "POST", `/api/kills/${firstKill.killId}/confirm`, {
		token: tokens.get(alice.id),
	});
	await expect(200, "POST", `/api/kills/${firstKill.killId}/confirm`, {
		token: tokens.get(firstKill.victimId),
	});
	const aliceAfter = await me(alice.id);
	const victimAfter = await me(firstKill.victimId);
	assert.equal(aliceAfter.target?.id, victimBefore.target?.id, "cible non héritée");
	assert.equal(aliceAfter.mission, victimBefore.mission, "mission non héritée");
	assert.equal(aliceAfter.killCount, 1);
	assert.equal(victimAfter.status, "ELIMINE");
	assert.equal(victimAfter.target, null, "un éliminé voit encore une cible");
	assert.equal(victimAfter.mission, null, "un éliminé voit encore une mission");
	assert.equal(victimAfter.eliminatedBy, alice.name);
	ok("le chasseur hérite de la cible et de la mission, la victime ne voit plus rien");
	checkCycle();

	step("Kill contesté, l'orga accepte");
	const hunter2 = (await firstAlive()).id;
	const secondKill = await declareKill(hunter2);
	await expect(200, "POST", `/api/kills/${secondKill.killId}/contest`, {
		token: tokens.get(secondKill.victimId),
	});
	await expect(409, "POST", `/api/kills/${secondKill.killId}/confirm`, {
		token: tokens.get(secondKill.victimId),
	});
	const contests = (await expect(200, "GET", "/api/orga/contests", { orga: true })) as Contest[];
	assert.deepEqual(
		contests.map((contest) => contest.killId),
		[secondKill.killId],
	);
	await expect(403, "POST", `/api/orga/kills/${secondKill.killId}/accept`);
	await expect(204, "POST", `/api/orga/kills/${secondKill.killId}/accept`, { orga: true });
	assert.equal((await me(secondKill.victimId)).status, "ELIMINE");
	ok("contestation visible par l'orga, kill validé après décision");
	checkCycle();

	step("Kill contesté, l'orga rejette");
	const hunter3 = (await firstAlive()).id;
	const targetBefore = (await me(hunter3)).target?.id;
	const thirdKill = await declareKill(hunter3);
	await expect(200, "POST", `/api/kills/${thirdKill.killId}/contest`, {
		token: tokens.get(thirdKill.victimId),
	});
	await expect(204, "POST", `/api/orga/kills/${thirdKill.killId}/reject`, { orga: true });
	assert.equal((await me(thirdKill.victimId)).status, "VIVANT");
	assert.equal((await me(hunter3)).target?.id, targetBefore);
	assert.equal((await me(hunter3)).huntingKill, null);
	ok("la victime reste en vie, le chasseur garde sa cible et peut redéclarer");
	checkCycle();

	step("Changement de mission");
	const changer = (await firstAlive()).id;
	const missionBefore = (await me(changer)).mission;
	const changed = (await expect(200, "POST", "/api/me/mission", {
		token: tokens.get(changer),
	})) as Me;
	assert.notEqual(changed.mission, missionBefore);
	assert.equal(changed.canChangeMission, false);
	await expect(409, "POST", "/api/me/mission", { token: tokens.get(changer) });
	ok("mission changée une fois, la deuxième est refusée");

	step("Validation automatique (le serveur, sans réponse de la victime)");
	const hunter4 = (await firstAlive()).id;
	const fourthKill = await declareKill(hunter4);
	// On recule l'heure de déclaration de 11 min au lieu d'attendre 10 vraies minutes.
	const db = new DatabaseSync(dbPath);
	db.prepare("UPDATE kills SET declared_at = declared_at - 11 * 60000 WHERE id = ?").run(
		fourthKill.killId,
	);
	db.close();
	let autoValidated = false;
	for (let i = 0; i < 24 && !autoValidated; i++) {
		await new Promise((resolve) => setTimeout(resolve, 500));
		autoValidated = (await me(fourthKill.victimId)).status === "ELIMINE";
	}
	assert.ok(autoValidated, "kill non validé automatiquement après 12 s");
	ok("kill validé par le serveur seul");
	checkCycle();

	step("Un joueur quitte la partie");
	const leaver = (await firstAlive()).id;
	const leaverBefore = await me(leaver);
	const leaverHunter = await hunterOf(leaver);
	await expect(200, "POST", "/api/me/leave", { token: tokens.get(leaver) });
	await expect(409, "POST", "/api/me/leave", { token: tokens.get(leaver) });
	const heir = await me(leaverHunter);
	assert.equal(heir.target?.id, leaverBefore.target?.id, "cible non transmise au chasseur");
	assert.equal(heir.mission, leaverBefore.mission, "mission non transmise au chasseur");
	ok("son chasseur hérite de sa cible et de sa mission");
	checkCycle();

	step("Fil d'événements");
	const events = (await expect(200, "GET", "/api/orga/events", { orga: true })) as GameEvent[];
	assert.equal(events.length, 3, "3 kills validés attendus dans le fil");
	const game = (await expect(200, "GET", "/api/game")) as Game;
	assert.equal(game.status, "EN_COURS");
	await expect(409, "GET", "/api/results");
	ok("3 kills dans le fil, résultats cachés tant que la partie tourne");

	step("Fin de partie par l'orga");
	await expect(204, "POST", "/api/orga/end", { orga: true });
	await expect(409, "POST", "/api/kills", { token: tokens.get((await firstAlive()).id) });
	const results = (await expect(200, "GET", "/api/results")) as Results;
	assert.equal(results.kills.length, 3);
	assert.equal(results.ranking.length, 6);
	assert.ok(results.winners.length >= 1, "aucun gagnant");
	assert.ok(results.winners.every((winner) => winner.status === "VIVANT"));
	ok(`gagnant(s) : ${results.winners.map((winner) => winner.name).join(", ")}`);

	step("Remise à zéro");
	await expect(204, "POST", "/api/orga/reset", { orga: true });
	assert.equal(await expect(200, "GET", "/api/game"), null);
	await expect(401, "GET", "/api/me", { token: tokens.values().next().value });
	ok("partie effacée, les anciens tokens ne valent plus rien");
}

try {
	await simulate();
	console.log("\n✅ Partie simulée de bout en bout sans erreur.");
} catch (error) {
	console.error("\n❌ La simulation a échoué :\n");
	console.error(error);
	console.error("\n--- Logs du serveur ---\n" + serverLogs);
	process.exitCode = 1;
} finally {
	server.kill();
	rmSync(tmpDir, { recursive: true, force: true });
}
