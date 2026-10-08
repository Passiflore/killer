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

export interface Me extends Player {
	target: { id: number; name: string } | null;
	mission: string | null;
}

export interface Kill {
	id: number;
	chasseurId: number;
	victimeId: number;
	status: KillStatus;
	declaredAt: number;
	resolvedAt: number | null;
}
