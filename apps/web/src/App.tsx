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

// Renvoie le joueur, ou null si le serveur ne reconnaît pas le token.
async function fetchMe(token: string): Promise<Me | null> {
	const response = await fetch("/api/me", {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!response.ok) return null;
	return (await response.json()) as Me;
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
		const token = localStorage.getItem(TOKEN_KEY);
		if (gameStatus !== "EN_COURS" || !token) return;

		fetchMe(token)
			.then((found) => {
				if (found) setMe(found);
			})
			.catch(console.error);
	}, [gameStatus]);

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

	if (gameStatus === "EN_COURS") {
		return <PlayerPage me={me} players={players} />;
	}

	return <LobbyPage me={me} players={players} />;
}

export default App;
