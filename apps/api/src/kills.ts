import type { DatabaseSync } from "node:sqlite";
import type {
	GameEvent,
	KillStatus,
	PlayerResult,
	PlayerStatus,
	Results,
} from "shared";
import { inTransaction } from "./schema.ts";

const PENDING = "('EN_ATTENTE', 'CONTESTE')";

interface PlayerRow {
	id: number;
	status: PlayerStatus;
	target_id: number | null;
	mission_id: number | null;
}

export interface KillRow {
	id: number;
	chasseur_id: number;
	victime_id: number;
	mission_id: number;
	status: KillStatus;
	declared_at: number;
}

function getPlayer(db: DatabaseSync, id: number): PlayerRow | undefined {
	return db
		.prepare(
			"SELECT id, status, target_id, mission_id FROM players WHERE id = ?",
		)
		.get(id) as PlayerRow | undefined;
}

export function getKill(db: DatabaseSync, id: number): KillRow | undefined {
	return db
		.prepare(
			"SELECT id, chasseur_id, victime_id, mission_id, status, declared_at FROM kills WHERE id = ?",
		)
		.get(id) as KillRow | undefined;
}

export function isPending(status: KillStatus): boolean {
	return status === "EN_ATTENTE" || status === "CONTESTE";
}

function isInPendingKill(db: DatabaseSync, playerId: number): boolean {
	const row = db
		.prepare(
			`SELECT 1 FROM kills WHERE status IN ${PENDING} AND (chasseur_id = ? OR victime_id = ?)`,
		)
		.get(playerId, playerId);
	return row !== undefined;
}

export function whyCannotDeclareKill(
	db: DatabaseSync,
	hunterId: number,
): string | null {
	const hunter = getPlayer(db, hunterId);
	if (!hunter || hunter.status !== "VIVANT" || hunter.target_id === null) {
		return "Tu ne peux pas déclarer de kill.";
	}

	if (isInPendingKill(db, hunterId)) {
		return "Un kill te concerne déjà, attends qu'il soit réglé.";
	}
	if (isInPendingKill(db, hunter.target_id)) {
		return "Ta cible est déjà impliquée dans un kill en cours.";
	}
	return null;
}

export function declareKill(
	db: DatabaseSync,
	hunterId: number,
	now: number,
): number {
	const reason = whyCannotDeclareKill(db, hunterId);
	if (reason) throw new Error(reason);

	const hunter = getPlayer(db, hunterId)!;
	const result = db
		.prepare(
			"INSERT INTO kills (chasseur_id, victime_id, mission_id, declared_at) VALUES (?, ?, ?, ?)",
		)
		.run(hunterId, hunter.target_id, hunter.mission_id, now);
	return Number(result.lastInsertRowid);
}

export function validateKill(
	db: DatabaseSync,
	killId: number,
	now: number,
): void {
	const kill = getKill(db, killId);
	if (!kill || !isPending(kill.status)) {
		throw new Error("Ce kill n'est plus en cours.");
	}
	const victim = getPlayer(db, kill.victime_id)!;

	inTransaction(db, () => {
		db.prepare(
			"UPDATE kills SET status = 'VALIDE', resolved_at = ? WHERE id = ?",
		).run(now, killId);
		db.prepare(
			"UPDATE players SET status = 'ELIMINE', target_id = NULL, mission_id = NULL WHERE id = ?",
		).run(victim.id);

		if (victim.target_id === kill.chasseur_id) {
			db.prepare(
				"UPDATE players SET target_id = NULL, mission_id = NULL WHERE id = ?",
			).run(kill.chasseur_id);
			db.prepare(
				"UPDATE game SET status = 'TERMINEE', ended_at = ? WHERE id = 1",
			).run(now);
		} else {
			db.prepare(
				"UPDATE players SET target_id = ?, mission_id = ? WHERE id = ?",
			).run(victim.target_id, victim.mission_id, kill.chasseur_id);
		}
	});
}

export function contestKill(db: DatabaseSync, killId: number): void {
	const kill = getKill(db, killId);
	if (kill?.status !== "EN_ATTENTE") {
		throw new Error("Ce kill ne peut plus être contesté.");
	}
	db.prepare("UPDATE kills SET status = 'CONTESTE' WHERE id = ?").run(killId);
}

export function rejectKill(
	db: DatabaseSync,
	killId: number,
	now: number,
): void {
	const kill = getKill(db, killId);
	if (!kill || !isPending(kill.status)) {
		throw new Error("Ce kill n'est plus en cours.");
	}
	db.prepare(
		"UPDATE kills SET status = 'REJETE', resolved_at = ? WHERE id = ?",
	).run(now, killId);
}

export function autoValidateExpiredKills(
	db: DatabaseSync,
	now: number,
): number {
	const expired = db
		.prepare(
			`SELECT k.id FROM kills k, game g
			 WHERE k.status = 'EN_ATTENTE'
			   AND k.declared_at + g.auto_validate_minutes * 60000 <= ?`,
		)
		.all(now) as unknown as { id: number }[];

	for (const { id } of expired) {
		validateKill(db, id, now);
	}
	return expired.length;
}

export function endGame(db: DatabaseSync, now: number): void {
	inTransaction(db, () => {
		db.prepare(
			`UPDATE kills SET status = 'REJETE', resolved_at = ? WHERE status IN ${PENDING}`,
		).run(now);
		db.prepare(
			"UPDATE game SET status = 'TERMINEE', ended_at = ? WHERE id = 1",
		).run(now);
	});
}

export function getResults(db: DatabaseSync): Results {
	const ranking = db
		.prepare(
			`SELECT p.id, p.name, p.status,
			        (SELECT COUNT(*) FROM kills k
			         WHERE k.chasseur_id = p.id AND k.status = 'VALIDE') AS killCount
			 FROM players p
			 ORDER BY p.status = 'VIVANT' DESC, killCount DESC, p.name`,
		)
		.all() as unknown as PlayerResult[];

	const survivors = ranking.filter((player) => player.status === "VIVANT");
	const best = Math.max(...survivors.map((player) => player.killCount));
	const winners = survivors.filter((player) => player.killCount === best);

	const kills = db
		.prepare(
			`SELECT k.id AS killId, c.id AS chasseurId, c.name AS chasseurName,
			        v.id AS victimeId, v.name AS victimeName, m.text AS mission,
			        k.resolved_at AS resolvedAt
			 FROM kills k
			 JOIN players c ON c.id = k.chasseur_id
			 JOIN players v ON v.id = k.victime_id
			 JOIN missions m ON m.id = k.mission_id
			 WHERE k.status = 'VALIDE'
			 ORDER BY k.resolved_at`,
		)
		.all() as unknown as GameEvent[];

	return { winners, ranking, kills };
}

// Nombre de changements de mission autorisés par joueur.
export const MAX_MISSION_CHANGES = 1;

export function changeMission(db: DatabaseSync, playerId: number): void {
	const player = db
		.prepare("SELECT status, mission_id, mission_changes FROM players WHERE id = ?")
		.get(playerId) as
		| { status: PlayerStatus; mission_id: number | null; mission_changes: number }
		| undefined;
	if (!player || player.status !== "VIVANT" || player.mission_id === null) {
		throw new Error("Tu ne peux pas changer de mission.");
	}
	if (player.mission_changes >= MAX_MISSION_CHANGES) {
		throw new Error("Tu as déjà changé de mission.");
	}
	// Le kill en cours garde la mission d'origine : on attend qu'il soit réglé.
	if (isInPendingKill(db, playerId)) {
		throw new Error("Un kill te concerne déjà, attends qu'il soit réglé.");
	}

	// De préférence une mission que personne n'a en ce moment, sinon n'importe quelle autre.
	const next = (db
		.prepare(
			`SELECT id FROM missions
			 WHERE id NOT IN (SELECT mission_id FROM players
			                  WHERE status = 'VIVANT' AND mission_id IS NOT NULL)
			 ORDER BY RANDOM() LIMIT 1`,
		)
		.get() ??
		db
			.prepare("SELECT id FROM missions WHERE id != ? ORDER BY RANDOM() LIMIT 1")
			.get(player.mission_id)) as { id: number } | undefined;
	if (!next) {
		throw new Error("Aucune autre mission disponible.");
	}

	db.prepare(
		"UPDATE players SET mission_id = ?, mission_changes = mission_changes + 1 WHERE id = ?",
	).run(next.id, playerId);
}

export function leaveGame(db: DatabaseSync, playerId: number, now: number): void {
	const player = getPlayer(db, playerId);
	if (!player || player.status !== "VIVANT") {
		throw new Error("Tu ne fais plus partie de la partie.");
	}
	const hunter = db
		.prepare("SELECT id FROM players WHERE target_id = ? AND status = 'VIVANT'")
		.get(playerId) as { id: number } | undefined;

	inTransaction(db, () => {
		db.prepare(
			`UPDATE kills SET status = 'REJETE', resolved_at = ?
			 WHERE status IN ${PENDING} AND (chasseur_id = ? OR victime_id = ?)`,
		).run(now, playerId, playerId);
		db.prepare(
			"UPDATE players SET status = 'ELIMINE', target_id = NULL, mission_id = NULL WHERE id = ?",
		).run(playerId);

		if (!hunter) return;
		if (player.target_id === hunter.id) {
			db.prepare(
				"UPDATE players SET target_id = NULL, mission_id = NULL WHERE id = ?",
			).run(hunter.id);
			db.prepare(
				"UPDATE game SET status = 'TERMINEE', ended_at = ? WHERE id = 1",
			).run(now);
		} else {
			db.prepare(
				"UPDATE players SET target_id = ?, mission_id = ? WHERE id = ?",
			).run(player.target_id, player.mission_id, hunter.id);
		}
	});
}
