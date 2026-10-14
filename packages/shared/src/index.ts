export type GameStatus = "LOBBY" | "EN_COURS" | "TERMINEE";
export type PlayerStatus = "VIVANT" | "ELIMINE";
export type KillStatus = "EN_ATTENTE" | "VALIDE" | "CONTESTE" | "REJETE";

export interface Game {
	status: GameStatus;
	autoValidateMinutes: number;
	startedAt: number | null;
	endedAt: number | null;
}

export interface Player {
	id: number;
	name: string;
	status: PlayerStatus;
}

export interface PendingKill {
	id: number;
	status: KillStatus;
	declaredAt: number;
}

export interface Me extends Player {
	target: { id: number; name: string } | null;
	mission: string | null;
	killCount: number;
	huntingKill: PendingKill | null;
	victimKill: PendingKill | null;
	eliminatedBy: string | null;
}

export interface Kill {
	id: number;
	chasseurId: number;
	victimeId: number;
	status: KillStatus;
	declaredAt: number;
	resolvedAt: number | null;
}
export interface JoinResponse {
	token: string;
	me: Me;
}

export interface ApiError {
	error: string;
}

export interface ServerToClientEvents {
	players: (players: Player[]) => void;
	game: (game: Game | null) => void;
	refresh: () => void;
}
