import type { Game, Me, Player } from "shared";
import SpyKilled from "../../assets/SpyKilled";
import BrandBar from "../../components/BrandBar/BrandBar";
import Chrono from "../../components/Chrono/Chrono";
import { ORGA_CODE_KEY } from "../../storage";
import styles from "./EliminatedPage.module.css";

// Écran d'un joueur éliminé (tué ou parti de lui-même) pendant que la partie continue.
function EliminatedPage({
	me,
	game,
	players,
}: {
	me: Me;
	game: Game;
	players: Player[];
}) {
	const aliveCount = players.filter((player) => player.status === "VIVANT").length;

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
				<SpyKilled />
			</div>

			<div className={styles.text}>
				<p className={styles.title}>
					{me.eliminatedBy
						? `Tu t'es fait éliminer par ${me.eliminatedBy}`
						: "Tu as quitté la partie"}
				</p>
				<p className={styles.detail}>
					{me.eliminatedBy
						? "Ton aventure s'arrête ici, mais la partie continue pour les autres agents."
						: "Ta mission s'arrête ici. Tes kills restent au classement final."}
				</p>
			</div>

			<div className={`actions ${styles.score}`}>
				<p className={styles.count}>{me.killCount}</p>
				<div>
					<p className={styles.countLabel}>
						kill{me.killCount > 1 && "s"} à ton actif
					</p>
					<p className="hint">Ton dossier reste dans les annales.</p>
				</div>
			</div>
		</main>
	);
}
export default EliminatedPage;
