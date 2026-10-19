import { useEffect, useState } from "react";
import type { Game, Me, Player } from "shared";
import { postAsPlayer } from "../../api";
import SpyArgument from "../../assets/SpyArgument";
import SpyKilled from "../../assets/SpyKilled";
import BrandBar from "../../components/BrandBar/BrandBar";
import Chrono from "../../components/Chrono/Chrono";
import { ORGA_CODE_KEY } from "../../storage";
import styles from "./KilledPage.module.css";

// Affiche « hh:mm:ss » jusqu'à `until`, mis à jour chaque seconde.
function Countdown({ until }: { until: number }) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const seconds = Math.max(0, Math.ceil((until - now) / 1000));
	return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
		.map((value) => String(value).padStart(2, "0"))
		.join(":");
}

// Écran de la victime pendant qu'un kill contre elle est en cours.
function KilledPage({
	kill,
	game,
	players,
	onMeChange,
}: {
	kill: NonNullable<Me["victimKill"]>;
	game: Game;
	players: Player[];
	onMeChange: (me: Me) => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const isContested = kill.status === "CONTESTE";
	const autoValidateAt = kill.declaredAt + game.autoValidateMinutes * 60_000;
	const aliveCount = players.filter((player) => player.status === "VIVANT").length;

	// Le téléphone vibre quand un kill est déclaré contre toi (Android seulement :
	// l'iPhone ne laisse pas un site web faire vibrer). `?.` : rien si non supporté.
	useEffect(() => {
		if (!isContested) navigator.vibrate?.([300, 150, 300, 150, 600]);
	}, [kill.id, isContested]);

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
			<BrandBar title="Killer" gameName={game.name} />

			{/* L'orga joueur doit pouvoir rejoindre son espace (contestations, fin de partie). */}
			{localStorage.getItem(ORGA_CODE_KEY) !== null && (
				<a className="button" href="/orga">
					Portail admin
				</a>
			)}

			<div>
				<Chrono game={game} />
				<p className={styles.remaining}>
					{aliveCount} joueur{aliveCount > 1 && "s"} restant
					{aliveCount > 1 && "s"}
				</p>
			</div>

			<p className="eyebrow">Rapport d'incident / Échec de la mission</p>

			<div className={styles.illustration}>
				{isContested ? <SpyArgument /> : <SpyKilled />}
			</div>

			<div className={styles.text}>
				<p className={styles.title}>
					{isContested ? (
						<>
							Contestation
							<br />
							en cours
						</>
					) : (
						"Tu t'es fait kill"
					)}
				</p>
				<p className={styles.detail}>
					{isContested
						? "L'organisateur va trancher. Les actions sont désactivées en attendant."
						: `Agent ${kill.chasseurName} déclare avoir réussi sa mission. Tu reconnais le piège ou tu contestes ?`}
				</p>
			</div>

			<div className="actions">
				{/* Un kill contesté n'est jamais validé automatiquement : pas de timer. */}
				{!isContested && (
					<div>
						<p className={styles.countdown}>
							<Countdown until={autoValidateAt} />
						</p>
						<p className={styles.detail}>avant validation auto</p>
					</div>
				)}
				{error && <p className="error">{error}</p>}
				<button
					type="button"
					className="button"
					onClick={() => answer("confirm")}
					disabled={isContested || isLoading}
				>
					Je me suis fait avoir
				</button>
				<button
					type="button"
					className="button secondary"
					onClick={() => answer("contest")}
					disabled={isContested || isLoading}
				>
					Contester
				</button>
			</div>
		</main>
	);
}
export default KilledPage;
