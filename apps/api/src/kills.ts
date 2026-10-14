import type { DatabaseSync } from "node:sqlite";
import type { KillStatus, PlayerStatus } from "shared";
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
