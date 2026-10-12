import { useState } from "react";
import type { ApiError, JoinResponse, Me } from "shared";

function JoinPage({ onJoined }: { onJoined: (me: Me) => void }) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const response = await fetch("/api/players", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			const data = await response.json();

			if (!response.ok) {
				setError((data as ApiError).error);
				return;
			}

			const joined = data as JoinResponse;
			localStorage.setItem("killer-token", joined.token);
			onJoined(joined.me);
		} catch (err) {
			setError(
				"Impossible de rejoindre la partie. Vérifie ta connexion et réessaie.",
			);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<label htmlFor="name">Ton nom</label>
			<input
				id="name"
				type="text"
				placeholder="Ex : Léa"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			<button type="submit" disabled={isLoading}>
				{isLoading ? "Connexion…" : "Rejoindre"}
			</button>
			{error && <p>{error}</p>}
		</form>
	);
}
export default JoinPage;
