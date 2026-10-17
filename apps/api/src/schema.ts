import { DatabaseSync } from "node:sqlite";

export function createDb(path: string): DatabaseSync {
	const db = new DatabaseSync(path);
	db.exec(`
		PRAGMA foreign_keys = ON;

		CREATE TABLE IF NOT EXISTS game (
			id                    INTEGER PRIMARY KEY CHECK (id = 1),
			status                TEXT    NOT NULL DEFAULT 'LOBBY'
			                      CHECK (status IN ('LOBBY', 'EN_COURS', 'TERMINEE')),
			orga_code             TEXT    NOT NULL,
			code                  TEXT    NOT NULL,
			name                  TEXT    NOT NULL,
			orga_name             TEXT    NOT NULL,
			ends_at               INTEGER,
			orga_plays            INTEGER NOT NULL DEFAULT 0,
			auto_validate_minutes INTEGER NOT NULL DEFAULT 10,
			started_at            INTEGER,
			ended_at              INTEGER
		);

		CREATE TABLE IF NOT EXISTS missions (
			id     INTEGER PRIMARY KEY,
			text   TEXT    NOT NULL,
			custom INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS players (
			id         INTEGER PRIMARY KEY,
			name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
			token      TEXT    NOT NULL UNIQUE,
			status     TEXT    NOT NULL DEFAULT 'VIVANT'
			           CHECK (status IN ('VIVANT', 'ELIMINE')),
			target_id  INTEGER REFERENCES players(id),
			mission_id INTEGER REFERENCES missions(id),
			photo      TEXT,
			joined_at  INTEGER NOT NULL,
			mission_changes INTEGER NOT NULL DEFAULT 0
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

	// Base créée avant l'ajout de la colonne : on la rajoute (la prod a déjà une base).
	const columns = db.prepare("PRAGMA table_info(players)").all() as { name: string }[];
	if (!columns.some((column) => column.name === "mission_changes")) {
		db.exec("ALTER TABLE players ADD COLUMN mission_changes INTEGER NOT NULL DEFAULT 0");
	}
	return db;
}

export function inTransaction(db: DatabaseSync, fn: () => void): void {
	db.exec("BEGIN");
	try {
		fn();
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		throw error;
	}
}
