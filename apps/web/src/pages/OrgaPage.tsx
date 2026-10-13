import { useState } from "react";
import type { ApiError } from "shared";

function OrgaPage() {
	const [orgaCode, setOrgaCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isCreated, setIsCreated] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const response = await fetch("/api/game", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orgaCode }),
			});
			const data = await response.json();

			if (!response.ok) {
				setError((data as ApiError).error);

				return;
			}

			setIsCreated(true);
		} catch (err) {
			setError(
				"Impossible de créer la partie. Vérifie ta connexion et réessaie.",
			);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<label htmlFor="orgaCode">Code de la partie</label>
			<input
				id="orgaCode"
				type="password"
				value={orgaCode}
				onChange={(event) => setOrgaCode(event.target.value)}
			/>
			<button type="submit" disabled={isLoading}>
				{isLoading ? "Création…" : "Créer la partie"}
			</button>
			{error && <p>{error}</p>}
			{isCreated && <p>Partie créée avec succès ✅</p>}
		</form>
	);
}
export default OrgaPage;
