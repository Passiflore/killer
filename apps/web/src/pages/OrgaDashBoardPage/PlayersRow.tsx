import type { Player } from "shared";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./OrgaDashboardPage.module.css";

function PlayersRow({
	players,
	onRemove,
}: {
	players: Player[];
	onRemove: (player: Player) => void;
}) {
	return (
		<section>
			<p className={styles.remaining}>
				{players.length} joueur{players.length > 1 && "s"} restant
				{players.length > 1 && "s"}
			</p>
			<ul className={styles.playersRow}>
				{players.map((player) => (
					<li key={player.id} className={styles.playerItem}>
						<div className={styles.playerPhotoWrap}>
							<Avatar playerId={player.id} className={styles.playerPhoto} />
							<button
								type="button"
								className={styles.remove}
								onClick={() => onRemove(player)}
								aria-label={`Retirer ${player.name}`}
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
									aria-hidden="true"
								>
									<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
								</svg>
							</button>
						</div>
						<span className={styles.playerName}>{player.name}</span>
					</li>
				))}
			</ul>
		</section>
	);
}
export default PlayersRow;
