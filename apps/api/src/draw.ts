export function drawCycle(playerIds: number[]): Map<number, number> {
	const shuffled = [...playerIds];
	const targets = new Map<number, number>();

	if (playerIds.length < 2) {
		throw new Error("Pas assez de joueur");
	}

	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	for (let i = 0; i < shuffled.length; i++) {
		const hunter = shuffled[i];
		const target = shuffled[(i + 1) % shuffled.length];
		targets.set(hunter, target);
	}

	return targets;
}
