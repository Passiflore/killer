import type { Me, Player } from "shared";

function LobbyPage({ me, players }: { me: Me; players: Player[] }) {
	return (
		<main>
			<h1>Salut {me.name} 👋</h1>
			<p>En attente du lancement de la partie…</p>

			<h2>Joueurs ({players.length})</h2>
			<ul>
				{players.map((player) => (
					<li key={player.id}>
						{player.name}
						{player.id === me.id && " (toi)"}
					</li>
				))}
			</ul>
		</main>
	);
}
export default LobbyPage;
