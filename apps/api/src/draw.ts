function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function drawCycle(playerIds: number[]): Map<number, number> {
	if (playerIds.length < 2) {
		throw new Error("Pas assez de joueur");
	}

	const shuffled = shuffle(playerIds);
	const targets = new Map<number, number>();

	for (let i = 0; i < shuffled.length; i++) {
		const hunter = shuffled[i];
		const target = shuffled[(i + 1) % shuffled.length];
		targets.set(hunter, target);
	}

	return targets;
}

export function drawMissions(
	playerIds: number[],
	missionIds: number[],
): Map<number, number> {
	if (missionIds.length === 0) {
		throw new Error("Aucune mission disponible");
	}

	const shuffled = shuffle(missionIds);
	const missions = new Map<number, number>();

	for (let i = 0; i < playerIds.length; i++) {
		missions.set(playerIds[i], shuffled[i % shuffled.length]);
	}

	return missions;
}
