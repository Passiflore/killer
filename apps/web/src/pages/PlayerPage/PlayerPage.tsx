import { useState } from "react";
import type { Me, Player } from "shared";
import { postAsPlayer } from "../../api";

function PlayerPage({
	me,
	players,
	onMeChange,
}: {
	me: Me;
	players: Player[];
	onMeChange: (me: Me) => void;
}) {
	const [showTarget, setShowTarget] = useState(false);
	const [showMission, setShowMission] = useState(false);
	// La cible déjà vue : si elle change (kill validé), on affiche le badge « New ».
	const [seenTargetId, setSeenTargetId] = useState(me.target?.id);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const alivePlayers = players.filter((player) => player.status === "VIVANT");

	if (!me.target) {
		return <p>Chargement de ta mission…</p>;
	}
	const target = me.target;
	const isNewTarget = target.id !== seenTargetId;

	function toggleTarget() {
		setShowTarget(!showTarget);
		setSeenTargetId(target.id);
	}

	async function handleKill() {
		if (!window.confirm(`Tu confirmes avoir eu ${target.name} ?`)) return;
		setError(null);
		setIsLoading(true);
		try {
			onMeChange(await postAsPlayer("/api/kills"));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	}

	async function handleLeave() {
		if (!window.confirm("Quitter la partie ? Tu ne pourras pas revenir.")) {
			return;
		}
		setError(null);
		try {
			onMeChange(await postAsPlayer("/api/me/leave"));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<main>
			<p>{alivePlayers.length} joueurs restants</p>

			<section>
				{isNewTarget && <p>New</p>}
				<h2>
					Ta cible{" "}
					<button type="button" onClick={toggleTarget}>
						{showTarget ? "Cacher" : "Afficher"}
					</button>
				</h2>
				<p>{showTarget ? target.name : "••••••"}</p>
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

			{me.huntingKill ? (
				<button type="button" disabled>
					Kill en attente de validation
				</button>
			) : (
				<button type="button" onClick={handleKill} disabled={isLoading}>
					J'ai killé
				</button>
			)}
			{error && <p>{error}</p>}
			<button type="button" onClick={handleLeave}>
				Quitter la partie
			</button>
		</main>
	);
}
export default PlayerPage;
