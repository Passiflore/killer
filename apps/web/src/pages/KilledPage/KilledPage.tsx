import { useEffect, useState } from "react";
import type { Game, Me, PendingKill } from "shared";
import { postAsPlayer } from "../../api";

// Affiche « mm:ss » jusqu'à `until`, mis à jour chaque seconde.
function Countdown({ until }: { until: number }) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const seconds = Math.max(0, Math.ceil((until - now) / 1000));
	const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
	const ss = String(seconds % 60).padStart(2, "0");
	return (
		<>
			{mm}:{ss}
		</>
	);
}

// Écran de la victime pendant qu'un kill contre elle est en cours.
function KilledPage({
	kill,
	game,
	onMeChange,
}: {
	kill: PendingKill;
	game: Game;
	onMeChange: (me: Me) => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const isContested = kill.status === "CONTESTE";
	const autoValidateAt = kill.declaredAt + game.autoValidateMinutes * 60_000;

	async function answer(action: "confirm" | "contest") {
		setError(null);
		setIsLoading(true);
		try {
			onMeChange(await postAsPlayer(`/api/kills/${kill.id}/${action}`));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main>
			{isContested ? (
				<h1>Contestation en cours, l'organisateur va trancher</h1>
			) : (
				<h1>Tu t'es fait kill :'(</h1>
			)}

			{!isContested && (
				<p>
					<Countdown until={autoValidateAt} /> avant validation auto
				</p>
			)}
			<button
				type="button"
				onClick={() => answer("confirm")}
				disabled={isContested || isLoading}
			>
				Je me suis fait avoir
			</button>
			<button
				type="button"
				onClick={() => answer("contest")}
				disabled={isContested || isLoading}
			>
				Contester
			</button>
			{error && <p>{error}</p>}
		</main>
	);
}
export default KilledPage;
