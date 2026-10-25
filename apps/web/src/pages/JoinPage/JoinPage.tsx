import { useState } from "react";
import type { ApiError, JoinResponse, Me } from "shared";
import { TOKEN_KEY } from "../../storage";
import PhotoPicker from "../../components/PhotoPicker/PhotoPicker";
import styles from "./JoinPage.module.css";

function JoinPage({
	code,
	gameName,
	onBack,
	onJoined,
}: {
	code: string;
	gameName: string | undefined;
	onBack: () => void;
	onJoined: (me: Me) => void;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [photo, setPhoto] = useState<string | null>(null);

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
				body: JSON.stringify({ name, code, photo }),
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
				<h1>{gameName}</h1>
				<p className="eyebrow">Recrutement / Identité de l'agent</p>
			</div>

			<PhotoPicker
				photo={photo}
				onPhoto={setPhoto}
				onError={setError}
				className={styles.avatar}
			/>

			<div className="field">
				<label htmlFor="name">Ton nom</label>
				<input
					id="name"
					type="text"
					placeholder="Ton nom"
					value={name}
					onChange={(event) => handleNameChange(event.target.value)}
					autoComplete="off"
					maxLength={30}
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
