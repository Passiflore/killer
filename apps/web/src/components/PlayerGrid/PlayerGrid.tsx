import type { Player } from "shared";
import Avatar from "../Avatar/Avatar";
import styles from "./PlayerGrid.module.css";

function PlayerGrid({ players }: { players: Player[] }) {
	return (
		<ul className={styles.grid}>
			{players.map((player) => (
				<li key={player.id} className={styles.card}>
					<span className={styles.cardLabel}>Special agent</span>
					<Avatar playerId={player.id} className={styles.photo} />
					<span className={styles.cardName}>{player.name}</span>
				</li>
			))}
		</ul>
	);
}
export default PlayerGrid;
