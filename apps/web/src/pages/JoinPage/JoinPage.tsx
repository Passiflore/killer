import { useState } from "react";
import type { ApiError, JoinResponse, Me } from "shared";
import { TOKEN_KEY } from "../../storage";
import agentPortrait from "../../assets/AgentPortrait.png";
import styles from "./JoinPage.module.css";

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

	const isReady = name.trim() !== "" && !error;

	function handleNameChange(value: string) {
		setName(value);
		setError(null);
	}

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

			<div className={styles.titleContainer}>
				<h1>Rejoindre la partie</h1>
				<p className="eyebrow">Recrutement / Identité de l'agent</p>
			</div>

			<div className={styles.avatar}>
				<img src={agentPortrait} alt="" className={styles.portrait} />
				<button
					type="button"
					className={styles.edit}
					aria-label="Prendre une photo"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
						<path d="m15 5 4 4" />
					</svg>
				</button>
			</div>

			<div className="field">
				<label htmlFor="name">Ton nom</label>
				<input
					id="name"
					type="text"
					placeholder="Ton nom"
					value={name}
					onChange={(event) => handleNameChange(event.target.value)}
					autoComplete="off"
					aria-invalid={error !== null}
					aria-describedby={error ? "name-error" : undefined}
				/>
				{error && (
					<p id="name-error" className={styles.error}>
						{error}
					</p>
				)}
			</div>

			<div className="actions">
				<p className="hint">
					{isReady
						? "Identité prête / Agent recruté"
						: "Identité à confirmer / Agent en attente"}
				</p>
				<button
					className="button"
					type="submit"
					disabled={isLoading || !isReady}
				>
					{isLoading ? "Connexion…" : "Rejoindre"}
				</button>
			</div>
		</form>
	);
}
export default JoinPage;
