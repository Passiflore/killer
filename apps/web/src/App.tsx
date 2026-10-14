import { useEffect, useState } from "react";
import type { Me } from "shared";
import "./App.css";
import JoinPage from "./pages/JoinPage";
import { TOKEN_KEY } from "./storage";
import OrgaPage from "./pages/OrgaPage";
import LobbyPage from "./pages/LobbyPage";
import OrgaDashboardPage from "./pages/OrgaDashboardPage";
import PlayerPage from "./pages/PlayerPage";
import { useLiveGame } from "./useLiveGame";
import { socket } from "./socket";
import KilledPage from "./pages/KilledPage";
import EliminatedPage from "./pages/EliminatedPage";

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
		if (game === null) return <OrgaPage />;
		return <OrgaDashboardPage game={game} players={players} />;
	}

	if (isChecking) {
		return <p>Chargement…</p>;
	}

	if (!me) {
		return <JoinPage onJoined={setMe} />;
	}

	if (game?.status === "EN_COURS") {
		if (me.status === "ELIMINE") {
			return <EliminatedPage me={me} />;
		}
		if (me.victimKill) {
			return (
				<KilledPage kill={me.victimKill} game={game} onMeChange={setMe} />
			);
		}
		return <PlayerPage me={me} players={players} onMeChange={setMe} />;
	}

	if (game?.status === "TERMINEE") {
		// Provisoire : l'écran de fin arrive à l'étape 8c.
		return <h1>Partie terminée !</h1>;
	}

	return <LobbyPage me={me} players={players} />;
}

export default App;
