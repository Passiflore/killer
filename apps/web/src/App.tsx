import { useEffect, useState } from "react";
import type { Me } from "shared";
import "./App.css";
import JoinPage from "./pages/JoinPage";
import { TOKEN_KEY } from "./storage";
import OrgaPage from "./pages/OrgaPage";
import LobbyPage from "./pages/LobbyPage";

function App() {
	const [me, setMe] = useState<Me | null>(null);

	const [isChecking, setIsChecking] = useState(
		() => localStorage.getItem(TOKEN_KEY) !== null,
	);

	useEffect(() => {
		const token = localStorage.getItem(TOKEN_KEY);
		if (!token) return;

		async function loadMe(token: string) {
			try {
				const response = await fetch("/api/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (response.ok) {
					setMe((await response.json()) as Me);
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

	if (window.location.pathname === "/orga") {
		return <OrgaPage />;
	}

	if (isChecking) {
		return <p>Chargement…</p>;
	}

	if (!me) {
		return <JoinPage onJoined={setMe} />;
	}

	return <LobbyPage me={me} />;
}

export default App;
