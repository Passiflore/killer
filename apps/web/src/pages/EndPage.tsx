import { useEffect, useState } from "react";
import type { Results } from "shared";

function kills(count: number) {
	return `${count} kill${count > 1 ? "s" : ""}`;
}

function EndPage({ myId }: { myId?: number }) {
	const [results, setResults] = useState<Results | null>(null);

	useEffect(() => {
		fetch("/api/results")
			.then((response) => response.json())
			.then((data) => setResults(data as Results))
			.catch(console.error);
	}, []);

	if (!results) {
		return <p>Chargement des résultats…</p>;
	}

	const { winners, ranking } = results;

	return (
		<main>
			<h1>Partie terminée !</h1>

			<h2>{winners.length > 1 ? "Ex aequo 🏆" : "Victoire 🏆"}</h2>
			{winners.map((winner) => (
				<p key={winner.id}>
					{winner.name} ({kills(winner.killCount)})
					{winner.id === myId && " — c'est toi !"}
				</p>
			))}

			<h2>Classement</h2>
			<ol>
				{ranking.map((player) => (
					<li key={player.id}>
						{player.name} : {kills(player.killCount)}
						{player.status === "ELIMINE" && " 💀"}
						{player.id === myId && " (toi)"}
					</li>
				))}
			</ol>
		</main>
	);
}
export default EndPage;
