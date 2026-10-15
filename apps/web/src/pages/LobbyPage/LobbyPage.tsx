import type { Game, Me, Player } from "shared";
import CodeBox from "../../components/CodeBox/CodeBox";
import LobbyHeader from "../../components/LobbyHeader/LobbyHeader";
import PlayerGrid from "../../components/PlayerGrid/PlayerGrid";
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
	return (
		<main>
			<LobbyHeader gameName={game?.name} playerCount={players.length} />
			<PlayerGrid players={players} />

			<div className="actions">
				<p className={styles.waiting}>
					En attente du lancement…
					<br />
					L'organisateur donnera le signal.
				</p>
				<CodeBox code={me.gameCode} />
			</div>
		</main>
	);
}
export default LobbyPage;
