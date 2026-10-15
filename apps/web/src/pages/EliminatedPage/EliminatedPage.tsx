import type { Me } from "shared";

function EliminatedPage({ me }: { me: Me }) {
	return (
		<main>
			<h1>
				{me.eliminatedBy
					? `Tu t'es fait éliminé(e) par ${me.eliminatedBy}`
					: "Tu as quitté la partie"}
			</h1>
			<p>
				avec {me.killCount} kill{me.killCount > 1 && "s"} à ton actif
			</p>
		</main>
	);
}
export default EliminatedPage;
