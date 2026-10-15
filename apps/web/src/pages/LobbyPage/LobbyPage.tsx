import { useState } from "react";
import type { Game, Me, Player } from "shared";
import Avatar from "../../components/Avatar";
import styles from "./LobbyPage.module.css";

function LobbyPage({
	me,
	game,
	players,
}: {
	me: Me;
	game: Game | null | undefined;
	players: Player[];
}) {
	const [isCopied, setIsCopied] = useState(false);
	const inviteLink = `${window.location.origin}/?code=${me.gameCode}`;

	async function copyInvite() {
		if (!navigator.clipboard) {
			window.prompt("Copie ce lien :", inviteLink);
			return;
		}
		await navigator.clipboard.writeText(inviteLink);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	}

	return (
		<main>
			<p className={styles.logo}>Killer</p>
			<h1>{game?.name}</h1>

			<div className={styles.status}>
				<p className="eyebrow">
					{players.length} joueur{players.length > 1 && "s"} / Prêts à jouer
				</p>
				<p className="hint">En attente...</p>
			</div>

			<ul className={styles.grid}>
				{players.map((player) => (
					<li key={player.id} className={styles.card}>
						<span className={styles.cardLabel}>Special agent</span>
						<Avatar playerId={player.id} className={styles.photo} />
						<span className={styles.cardName}>{player.name}</span>
					</li>
				))}
			</ul>

			<div className="actions">
				<p className={styles.waiting}>
					En attente du lancement…
					<br />
					L'organisateur donnera le signal.
				</p>

				<div className={styles.codeBox}>
					<div>
						<p className="label">Code de la partie</p>
						<p className={styles.code}>{me.gameCode}</p>
					</div>
					<button type="button" className={styles.copy} onClick={copyInvite}>
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-hidden="true"
						>
							<rect x="8" y="8" width="13" height="13" rx="1" />
							<path d="M4 16V4a1 1 0 0 1 1-1h12" />
						</svg>
						{isCopied ? "Copié ✓" : "Copier"}
					</button>
				</div>
			</div>
		</main>
	);
}
export default LobbyPage;
