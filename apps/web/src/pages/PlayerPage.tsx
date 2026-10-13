import { useState } from "react";
import type { Me, Player } from "shared";

function PlayerPage({ me, players }: { me: Me; players: Player[] }) {
	const [showTarget, setShowTarget] = useState(false);
	const [showMission, setShowMission] = useState(false);

	const alivePlayers = players.filter((player) => player.status === "VIVANT");

	if (me.status === "ELIMINE") {
		return <p>Tu as été éliminé·e 💀</p>;
	}

	if (!me.target) {
		return <p>Chargement de ta mission…</p>;
	}

	return (
		<main>
			<p>{alivePlayers.length} joueurs restants</p>

			<section>
				<h2>
					Ta cible{" "}
					<button type="button" onClick={() => setShowTarget(!showTarget)}>
						{showTarget ? "Cacher" : "Afficher"}
					</button>
				</h2>
				<p>{showTarget ? me.target.name : "••••••"}</p>
			</section>

			<section>
				<h2>
					Ta mission{" "}
					<button type="button" onClick={() => setShowMission(!showMission)}>
						{showMission ? "Cacher" : "Afficher"}
					</button>
				</h2>
				<p>{showMission ? me.mission : "••••••"}</p>
			</section>
		</main>
	);
}
export default PlayerPage;
