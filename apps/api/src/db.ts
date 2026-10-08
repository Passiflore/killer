import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(process.env.DB_PATH ?? "killer.db");

db.exec(`
	PRAGMA foreign_keys = ON;

	CREATE TABLE IF NOT EXISTS game (
		id                    INTEGER PRIMARY KEY CHECK (id = 1),
		status                TEXT    NOT NULL DEFAULT 'LOBBY'
		                      CHECK (status IN ('LOBBY', 'EN_COURS', 'TERMINEE')),
		orga_code             TEXT    NOT NULL,
		auto_validate_minutes INTEGER NOT NULL DEFAULT 10,
		started_at            INTEGER,
		ended_at              INTEGER
	);

	CREATE TABLE IF NOT EXISTS missions (
		id   INTEGER PRIMARY KEY,
		text TEXT    NOT NULL
	);

	CREATE TABLE IF NOT EXISTS players (
		id         INTEGER PRIMARY KEY,
		name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
		token      TEXT    NOT NULL UNIQUE,
		status     TEXT    NOT NULL DEFAULT 'VIVANT'
		           CHECK (status IN ('VIVANT', 'ELIMINE')),
		target_id  INTEGER REFERENCES players(id),
		mission_id INTEGER REFERENCES missions(id),
		joined_at  INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS kills (
		id          INTEGER PRIMARY KEY,
		chasseur_id INTEGER NOT NULL REFERENCES players(id),
		victime_id  INTEGER NOT NULL REFERENCES players(id),
		mission_id  INTEGER NOT NULL REFERENCES missions(id),
		status      TEXT    NOT NULL DEFAULT 'EN_ATTENTE'
		            CHECK (status IN ('EN_ATTENTE', 'VALIDE', 'CONTESTE', 'REJETE')),
		declared_at INTEGER NOT NULL,
		resolved_at INTEGER
	);
`);
