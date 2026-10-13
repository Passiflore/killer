import { useState } from "react";
import type { ApiError, Game, Player } from "shared";
import { ORGA_CODE_KEY } from "../storage";

function OrgaDashboardPage({
	game,
	players,
}: {
	game: Game;
	players: Player[];
}) {
	const [orgaCode, setOrgaCode] = useState(
		() => localStorage.getItem(ORGA_CODE_KEY) ?? "",
	);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleStart(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const response = await fetch("/api/game/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orgaCode }),
			});

			if (!response.ok) {
				setError(((await response.json()) as ApiError).error);
				return;
			}

			localStorage.setItem(ORGA_CODE_KEY, orgaCode);
		} catch (err) {
			setError(
				"Impossible de lancer la partie. Vérifie ta connexion et réessaie.",
			);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main>
			<h1>Espace orga</h1>
			<p>Statut : {game.status}</p>

			<h2>Joueurs ({players.length})</h2>
			<ul>
				{players.map((player) => (
					<li key={player.id}>{player.name}</li>
				))}
			</ul>

			{game.status === "LOBBY" && (
				<form onSubmit={handleStart}>
					<label htmlFor="orgaCode">Code orga</label>
					<input
						id="orgaCode"
						type="password"
						value={orgaCode}
						onChange={(event) => setOrgaCode(event.target.value)}
					/>
					<button type="submit" disabled={isLoading || players.length < 2}>
						{isLoading ? "Lancement…" : "Lancer la partie"}
					</button>
				</form>
			)}
			{error && <p>{error}</p>}
		</main>
	);
}
export default OrgaDashboardPage;
