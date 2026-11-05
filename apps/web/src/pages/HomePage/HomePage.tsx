import { useState } from "react";
import { postJson } from "../../api";
import { errorMessage } from "../../errorMessage";
import styles from "./HomePage.module.css";
import SpyWelcome from "../../assets/spyWelcome";

function HomePage({ onCodeOk }: { onCodeOk: (code: string) => void }) {
	const [code, setCode] = useState(
		() => new URLSearchParams(window.location.search).get("code") ?? "",
	);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			await postJson("/api/game/check", { code });
			onCodeOk(code.trim().toUpperCase());
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className={styles.logoContainer}>
				<SpyWelcome />
				<div>
					<p className={styles.title}>Killer</p>
					<p className={`eyebrow ${styles.slogan}`}>
						Piège tes amis. Garde ton secret.
					</p>
				</div>
			</div>

			<div className="actions">
				<div className="field">
					<label htmlFor="code">Rejoindre une partie</label>
					<input
						id="code"
						placeholder="Code de la partie"
						value={code}
						onChange={(event) => setCode(event.target.value.toUpperCase())}
						autoCapitalize="characters"
						autoComplete="off"
						maxLength={4}
					/>
				</div>
				{error && <p className="error">{error}</p>}
				<div className={styles.buttons}>
					<button className="button" type="submit" disabled={isLoading}>
						Rejoindre
					</button>
					<a className="button secondary" href="/orga">
						Crée une partie
					</a>
					<a className={`link ${styles.rulesLink}`} href="/regles">
						Comment jouer ?
					</a>
				</div>
			</div>
		</form>
	);
}
export default HomePage;
