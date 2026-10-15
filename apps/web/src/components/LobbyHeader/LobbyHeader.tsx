import styles from "./LobbyHeader.module.css";

function LobbyHeader({
	gameName,
	playerCount,
}: {
	gameName: string | undefined;
	playerCount: number;
}) {
	return (
		<>
			<p className={styles.logo}>Killer</p>
			<h1>{gameName}</h1>
			<div className={styles.status}>
				<p className="eyebrow">
					{playerCount} joueur{playerCount > 1 && "s"} / Prêts à jouer
				</p>
				<p className="hint">En attente...</p>
			</div>
		</>
	);
}
export default LobbyHeader;
