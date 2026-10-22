import { useEffect, useState } from "react";
import type { Game, Me } from "shared";
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
import RulesPage from "./pages/RulesPage/RulesPage";

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
	// Change à chaque création de partie pour recharger l'espace orga (voir plus bas).
	const [orgaKey, setOrgaKey] = useState(0);
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

	// Plus de partie (l'orga a tout effacé) : le badge de ce téléphone ne vaut plus rien.
	useEffect(() => {
		const onGame = (next: Game | null) => {
			if (next === null) {
				localStorage.removeItem(TOKEN_KEY);
				setMe(null);
			}
		};
		socket.on("game", onGame);
		return () => {
			socket.off("game", onGame);
		};
	}, []);

	// Après chaque kill, le serveur envoie « refresh » : on redemande SES infos.
	useEffect(() => {
		const onRefresh = () => reloadMe(setMe);
		socket.on("refresh", onRefresh);
		return () => {
			socket.off("refresh", onRefresh);
		};
	}, []);

	if (window.location.pathname === "/regles") {
		return <RulesPage />;
	}

	if (window.location.pathname === "/orga") {
		if (game === undefined) return <p>Chargement…</p>;
		if (game === null) {
			return (
				<CreateGamePage
					onCreated={(created) => {
						if (created) setMe(created);
						setOrgaKey((key) => key + 1);
					}}
				/>
			);
		}
		if (game.status === "TERMINEE") return <EndPage game={game} />;
		return (
			// Le socket annonce la partie avant que la réponse HTTP n'apporte le code orga :
			// la `key` force l'espace orga à relire le code une fois qu'il est enregistré.
			<OrgaDashboardPage
				key={orgaKey}
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
