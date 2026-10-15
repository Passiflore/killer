import { useState } from "react";
import type { ApiError, JoinResponse, Me } from "shared";
import { TOKEN_KEY } from "../storage";

function JoinPage({
	code,
	onBack,
	onJoined,
}: {
	code: string;
	onBack: () => void;
	onJoined: (me: Me) => void;
}) {
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
				body: JSON.stringify({ name, code }),
			});
			const data = await response.json();

			if (!response.ok) {
				setError((data as ApiError).error);
				return;
			}

			const joined = data as JoinResponse;
			localStorage.setItem(TOKEN_KEY, joined.token);
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
			<div className="topbar">
				<button type="button" className="link" onClick={onBack}>
					← Retour à l'accueil
				</button>
				<span className="hint">Code / {code}</span>
			</div>

			<div>
				<h1>Rejoindre la partie</h1>
				<p className="eyebrow">Recrutement / Identité de l'agent</p>
			</div>

			<div className="field">
				<label htmlFor="name">Ton nom</label>
				<input
					id="name"
					type="text"
					placeholder="Ton nom"
					value={name}
					onChange={(event) => setName(event.target.value)}
					autoComplete="off"
				/>
			</div>

			<div className="actions">
				{error && <p className="error">{error}</p>}
				<p className="hint">
					{name.trim() === ""
						? "Identité à confirmer / Agent en attente"
						: "Identité prête / Agent recruté"}
				</p>
				<button
					className="button"
					type="submit"
					disabled={isLoading || name.trim() === ""}
				>
					{isLoading ? "Connexion…" : "Rejoindre"}
				</button>
			</div>
		</form>
	);
}
export default JoinPage;
