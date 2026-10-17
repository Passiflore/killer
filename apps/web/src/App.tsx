import { useEffect, useState } from "react";
import type { Me } from "shared";
import JoinPage from "./pages/JoinPage/JoinPage";
import HomePage from "./pages/HomePage/HomePage";
import { TOKEN_KEY } from "./storage";
import CreateGamePage from "./pages/CreateGamePage/CreateGamePage";
import LobbyPage from "./pages/LobbyPage/LobbyPage";
import OrgaDashboardPage from "./pages/OrgaDashBoardPage/OrgaDashboardPage";
import PlayerPage from "./pages/PlayerPage/PlayerPage";
import { useLiveGame } from "./useLiveGame";
import { socket } from "./socket";
import KilledPage from "./pages/KilledPage/KilledPage";
import EliminatedPage from "./pages/EliminatedPage/EliminatedPage";
import EndPage from "./pages/EndPage/EndPage";

// Renvoie le joueur, ou null si le serveur ne reconnaît pas le token.
async function fetchMe(token: string): Promise<Me | null> {
	const response = await fetch("/api/me", {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) return null;
	return (await response.json()) as Me;
}

// Redemande ses infos au serveur, si le téléphone a un badge.
function reloadMe(onFound: (me: Me) => void) {
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) return;
	fetchMe(token)
		.then((found) => {
			if (found) onFound(found);
		})
		.catch(console.error);
}

function App() {
	const [me, setMe] = useState<Me | null>(null);
	const [gameCode, setGameCode] = useState<string | null>(null);
	const { game, players } = useLiveGame();

	const [isChecking, setIsChecking] = useState(
		() => localStorage.getItem(TOKEN_KEY) !== null,
	);

	useEffect(() => {
		const token = localStorage.getItem(TOKEN_KEY);
		if (!token) return;

		async function loadMe(token: string) {
			try {
				const found = await fetchMe(token);
				if (found) {
					setMe(found);
				} else {
					localStorage.removeItem(TOKEN_KEY);
				}
			} catch (err) {
				console.error(err);
			} finally {
				setIsChecking(false);
			}
		}

		loadMe(token);
	}, []);

	// Quand la partie démarre, on redemande SES infos : cible et mission viennent d'être tirées.
	const gameStatus = game?.status;
	useEffect(() => {
		if (gameStatus === "EN_COURS") reloadMe(setMe);
	}, [gameStatus]);

	// Après chaque kill, le serveur envoie « refresh » : on redemande SES infos.
	useEffect(() => {
		const onRefresh = () => reloadMe(setMe);
		socket.on("refresh", onRefresh);
		return () => {
			socket.off("refresh", onRefresh);
		};
	}, []);

	if (window.location.pathname === "/orga") {
		if (game === undefined) return <p>Chargement…</p>;
		if (game === null) {
			return (
				<CreateGamePage
					onCreated={(created) => {
						if (created) setMe(created);
					}}
				/>
			);
		}
		if (game.status === "TERMINEE") return <EndPage game={game} />;
		return (
			<OrgaDashboardPage
				game={game}
				players={players}
				isParticipant={me !== null}
			/>
		);
	}

	if (isChecking) {
		return <p>Chargement…</p>;
	}

	if (!me) {
		if (!gameCode) {
			return <HomePage onCodeOk={setGameCode} />;
		}
		return (
			<JoinPage
				code={gameCode}
				gameName={game?.name}
				onBack={() => setGameCode(null)}
				onJoined={setMe}
			/>
		);
	}

	if (game?.status === "EN_COURS") {
		if (me.status === "ELIMINE") {
			return <EliminatedPage me={me} game={game} players={players} />;
		}
		if (me.victimKill) {
			return (
				<KilledPage
					kill={me.victimKill}
					game={game}
					players={players}
					onMeChange={setMe}
				/>
			);
		}
		return (
			<PlayerPage
				me={me}
				game={game}
				players={players}
				onMeChange={setMe}
			/>
		);
	}

	if (game?.status === "TERMINEE") {
		return <EndPage game={game} />;
	}

	return <LobbyPage me={me} game={game} players={players} />;
}

export default App;
