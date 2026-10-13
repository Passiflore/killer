import { test } from "node:test";
import assert from "node:assert/strict";
import { drawCycle } from "./draw.ts";

// Part de `start` et suit les cibles jusqu'à revenir au départ.
// Renvoie la liste des joueurs visités dans l'ordre.
function followCycle(targets: Map<number, number>, start: number): number[] {
	const visited = [start];
	let current = targets.get(start);
	while (current !== undefined && current !== start) {
		if (visited.includes(current)) break; // boucle qui ne repasse pas par start
		visited.push(current);
		current = targets.get(current);
	}
	return visited;
}

test("chaque joueur a exactement une cible", () => {
	const players = [1, 2, 3, 4, 5];
	const targets = drawCycle(players);

	assert.equal(targets.size, players.length);
	for (const id of players) {
		assert.ok(targets.has(id), `le joueur ${id} n'a pas de cible`);
	}
});

test("chaque joueur est la cible d'exactement un joueur", () => {
	const players = [1, 2, 3, 4, 5];
	const targets = drawCycle(players);

	const hunted = [...targets.values()].sort((a, b) => a - b);
	assert.deepEqual(hunted, players);
});

test("personne ne se cible soi-même", () => {
	const targets = drawCycle([1, 2, 3, 4, 5]);

	for (const [hunter, target] of targets) {
		assert.notEqual(hunter, target, `le joueur ${hunter} se cible lui-même`);
	}
});

test("le tirage forme UN SEUL cycle qui passe par tout le monde", () => {
	const players = [1, 2, 3, 4, 5, 6, 7, 8];
	const targets = drawCycle(players);

	const cycle = followCycle(targets, players[0]);
	assert.equal(
		cycle.length,
		players.length,
		`le cycle depuis ${players[0]} ne passe que par ${cycle.join(" → ")}`,
	);
});

test("fonctionne avec 2 joueurs (ils se ciblent l'un l'autre)", () => {
	const targets = drawCycle([10, 20]);

	assert.equal(targets.get(10), 20);
	assert.equal(targets.get(20), 10);
});

test("refuse moins de 2 joueurs", () => {
	assert.throws(() => drawCycle([]));
	assert.throws(() => drawCycle([1]));
});

test("le tirage est aléatoire", () => {
	const players = [1, 2, 3, 4, 5, 6];
	const results = new Set<string>();
	for (let i = 0; i < 20; i++) {
		results.add(JSON.stringify([...drawCycle(players)]));
	}
	assert.ok(results.size > 1, "20 tirages ont tous donné le même résultat");
});
