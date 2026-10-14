import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { createDb } from "./schema.ts";
import {
	autoValidateExpiredKills,
	contestKill,
	declareKill,
	getKill,
	rejectKill,
	validateKill,
	whyCannotDeclareKill,
} from "./kills.ts";

function setup(): DatabaseSync {
	const db = createDb(":memory:");
	db.exec(
		"INSERT INTO game (id, orga_code, status, started_at) VALUES (1, '1234', 'EN_COURS', 0)",
	);
	for (let id = 1; id <= 4; id++) {
		db.prepare("INSERT INTO missions (id, text) VALUES (?, ?)").run(
			id,
			`mission ${id}`,
		);
		db.prepare(
			"INSERT INTO players (id, name, token, joined_at) VALUES (?, ?, ?, 0)",
		).run(id, `joueur ${id}`, `token ${id}`);
	}
	for (let id = 1; id <= 4; id++) {
		const target = (id % 4) + 1;
		db.prepare(
			"UPDATE players SET target_id = ?, mission_id = ? WHERE id = ?",
		).run(target, id, id);
	}
	return db;
}

function player(db: DatabaseSync, id: number) {
	return db
		.prepare("SELECT status, target_id, mission_id FROM players WHERE id = ?")
		.get(id) as {
		status: string;
		target_id: number | null;
		mission_id: number | null;
	};
}

function aliveCycle(db: DatabaseSync, start: number): number[] {
	const visited = [start];
	let current = player(db, start).target_id;
	while (current !== null && current !== start && !visited.includes(current)) {
		visited.push(current);
		current = player(db, current).target_id;
	}
	return visited;
}

test("déclarer un kill crée un kill EN_ATTENTE sur sa cible, avec sa mission", () => {
	const db = setup();
	const killId = declareKill(db, 1, 1000);

	const kill = getKill(db, killId)!;
	assert.equal(kill.status, "EN_ATTENTE");
	assert.equal(kill.chasseur_id, 1);
	assert.equal(kill.victime_id, 2);
	assert.equal(kill.mission_id, 1);
});

test("règle 4.5 : la victime d'un kill en cours ne peut pas déclarer", () => {
	const db = setup();
	declareKill(db, 1, 1000);

	assert.notEqual(whyCannotDeclareKill(db, 2), null);
	assert.throws(() => declareKill(db, 2, 1000));
});

test("règle 4.5 : on ne peut pas déclarer deux kills à la fois", () => {
	const db = setup();
	declareKill(db, 1, 1000);

	assert.notEqual(whyCannotDeclareKill(db, 1), null);
});

test("règle 4.5 : impossible si sa cible est impliquée dans un kill en cours", () => {
	const db = setup();
	declareKill(db, 2, 1000);

	assert.notEqual(whyCannotDeclareKill(db, 1), null);
});

test("un joueur non concerné peut déclarer pendant un autre kill", () => {
	const db = setup();
	declareKill(db, 1, 1000);

	assert.equal(whyCannotDeclareKill(db, 3), null);
});

test("kill validé : victime éliminée, le chasseur hérite de sa cible et de sa mission", () => {
	const db = setup();
	const killId = declareKill(db, 1, 1000);
	validateKill(db, killId, 2000);

	assert.equal(getKill(db, killId)!.status, "VALIDE");
	assert.deepEqual(
		{ ...player(db, 2) },
		{
			status: "ELIMINE",
			target_id: null,
			mission_id: null,
		},
	);
	assert.equal(player(db, 1).target_id, 3);
	assert.equal(player(db, 1).mission_id, 2);
});

test("après un kill validé, le cycle reste unique et sans trou", () => {
	const db = setup();
	validateKill(db, declareKill(db, 1, 1000), 2000);

	assert.deepEqual(aliveCycle(db, 1), [1, 3, 4]);
	assert.equal(player(db, 4).target_id, 1);
});

test("un joueur éliminé ne peut plus déclarer de kill", () => {
	const db = setup();
	validateKill(db, declareKill(db, 1, 1000), 2000);

	assert.notEqual(whyCannotDeclareKill(db, 2), null);
});

test("le dernier kill termine la partie", () => {
	const db = setup();
	validateKill(db, declareKill(db, 1, 1000), 2000);
	validateKill(db, declareKill(db, 1, 1000), 2000);
	validateKill(db, declareKill(db, 1, 1000), 2000);

	const game = db.prepare("SELECT status FROM game").get() as {
		status: string;
	};
	assert.equal(game.status, "TERMINEE");
	assert.equal(player(db, 1).status, "VIVANT");
	assert.equal(player(db, 1).target_id, null);
});

test("contester passe le kill en CONTESTE, toujours bloquant", () => {
	const db = setup();
	const killId = declareKill(db, 1, 1000);
	contestKill(db, killId);

	assert.equal(getKill(db, killId)!.status, "CONTESTE");
	assert.notEqual(whyCannotDeclareKill(db, 2), null);
});

test("kill rejeté : rien ne change, les joueurs sont débloqués", () => {
	const db = setup();
	const killId = declareKill(db, 1, 1000);
	contestKill(db, killId);
	rejectKill(db, killId, 2000);

	assert.equal(getKill(db, killId)!.status, "REJETE");
	assert.equal(player(db, 2).status, "VIVANT");
	assert.equal(player(db, 1).target_id, 2);
	assert.equal(whyCannotDeclareKill(db, 1), null);
});

test("un kill déjà tranché ne peut plus être validé ni contesté", () => {
	const db = setup();
	const killId = declareKill(db, 1, 1000);
	validateKill(db, killId, 2000);

	assert.throws(() => validateKill(db, killId, 3000));
	assert.throws(() => contestKill(db, killId));
	assert.throws(() => rejectKill(db, killId, 3000));
});

test("validation auto : un kill sans réponse depuis 10 min est validé", () => {
	const db = setup();
	const killId = declareKill(db, 1, 0);

	assert.equal(autoValidateExpiredKills(db, 9 * 60_000), 0);
	assert.equal(getKill(db, killId)!.status, "EN_ATTENTE");

	assert.equal(autoValidateExpiredKills(db, 10 * 60_000), 1);
	assert.equal(getKill(db, killId)!.status, "VALIDE");
	assert.equal(player(db, 2).status, "ELIMINE");
});

test("validation auto : un kill contesté attend l'orga", () => {
	const db = setup();
	const killId = declareKill(db, 1, 0);
	contestKill(db, killId);

	assert.equal(autoValidateExpiredKills(db, 60 * 60_000), 0);
	assert.equal(getKill(db, killId)!.status, "CONTESTE");
});

test("validation auto : la durée est réglable par partie", () => {
	const db = setup();
	db.exec("UPDATE game SET auto_validate_minutes = 2");
	declareKill(db, 1, 0);

	assert.equal(autoValidateExpiredKills(db, 2 * 60_000), 1);
});
