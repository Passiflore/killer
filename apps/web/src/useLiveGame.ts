import { useEffect, useState } from "react";
import type { Game, Player } from "shared";
import { socket } from "./socket";

// État de la partie et liste des joueurs, mis à jour en direct par Socket.IO.
// game vaut undefined tant que le serveur n'a pas encore répondu.
export function useLiveGame() {
	const [game, setGame] = useState<Game | null | undefined>(undefined);
	const [players, setPlayers] = useState<Player[]>([]);

	useEffect(() => {
		// D'abord écouter, ensuite se connecter : le serveur envoie tout dès la connexion.
		socket.on("game", setGame);
		socket.on("players", setPlayers);
		socket.connect();

		return () => {
			socket.off("game", setGame);
			socket.off("players", setPlayers);
			socket.disconnect();
		};
	}, []);

	return { game, players };
}
