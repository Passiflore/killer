import { useEffect, useState } from "react";
import type { Me, Player } from "shared";
import { socket } from "../socket";

function LobbyPage({ me }: { me: Me }) {
	const [players, setPlayers] = useState<Player[]>([]);

	useEffect(() => {
		socket.on("players", setPlayers);
		socket.connect();

		return () => {
			socket.off("players", setPlayers);
			socket.disconnect();
		};
	}, []);

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
