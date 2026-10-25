import { useState } from "react";
import type { ApiError, CreateGameResponse, Me } from "shared";
import MissionInput from "../../components/MissionInput/MissionInput";
import PhotoPicker from "../../components/PhotoPicker/PhotoPicker";
import { ORGA_CODE_KEY, TOKEN_KEY } from "../../storage";
import styles from "./CreateGamePage.module.css";

function toTimestamp(time: string): number | null {
	if (!time) return null;
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date();
	date.setHours(hours, minutes, 0, 0);
	if (date.getTime() <= Date.now()) {
		date.setDate(date.getDate() + 1);
	}
	return date.getTime();
}

function CreateGamePage({ onCreated }: { onCreated: (me: Me | null) => void }) {
	const [name, setName] = useState("");
	const [orgaName, setOrgaName] = useState("");
	const [endTime, setEndTime] = useState("");
	const [isParticipant, setIsParticipant] = useState(true);
	const [playerName, setPlayerName] = useState<string | null>(null);
	const [photo, setPhoto] = useState<string | null>(null);
	const [missions, setMissions] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const finalPlayerName = playerName ?? orgaName;
	const isReady =
		name.trim() !== "" &&
		orgaName.trim() !== "" &&
		(!isParticipant || finalPlayerName.trim() !== "");

	function removeMission(index: number) {
		setMissions(missions.filter((_, i) => i !== index));
	}

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const response = await fetch("/api/game", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					orgaName,
					endsAt: toTimestamp(endTime),
					participant: isParticipant,
					playerName: finalPlayerName,
					photo,
					missions,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				setError((data as ApiError).error);
				return;
			}

			const created = data as CreateGameResponse;
			localStorage.setItem(ORGA_CODE_KEY, created.orgaCode);
			if (created.player) {
				localStorage.setItem(TOKEN_KEY, created.player.token);
			}
			onCreated(created.player?.me ?? null);
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
			<div className="topbar">
				<a className="link" href="/">
					← Retour à l'accueil
				</a>
				<span className="hint">Nouveau dossier</span>
			</div>

			<div className={styles.titleContainer}>
				<p className={styles.title}>Crée une partie</p>
				<p className="eyebrow">Configuration de l'opération</p>
			</div>

			<div className="field">
				<label htmlFor="game-name">Nom de la partie</label>
				<input
					id="game-name"
					placeholder="Nom de la partie"
					value={name}
					onChange={(event) => setName(event.target.value)}
					autoComplete="off"
					maxLength={40}
				/>
			</div>

			<div className="field">
				<label htmlFor="orga-name">Nom de l'organisateur</label>
				<input
					id="orga-name"
					placeholder="Ton nom"
					value={orgaName}
					onChange={(event) => setOrgaName(event.target.value)}
					autoComplete="off"
					maxLength={30}
				/>
			</div>

			<div className="field">
				<label htmlFor="end-time">Heure de fin (facultatif)</label>
				<input
					id="end-time"
					type="time"
					value={endTime}
					onChange={(event) => setEndTime(event.target.value)}
				/>
			</div>

			<div className="field">
				<span className="label">Seras-tu participant ?</span>
				<div className={styles.toggle}>
					<button
						type="button"
						className={`button ${isParticipant ? "" : "secondary"} ${styles.choice}`}
						onClick={() => setIsParticipant(true)}
						aria-pressed={isParticipant}
					>
						Oui{isParticipant && " ✓"}
					</button>
					<button
						type="button"
						className={`button ${isParticipant ? "secondary" : ""} ${styles.choice}`}
						onClick={() => setIsParticipant(false)}
						aria-pressed={!isParticipant}
					>
						Non{!isParticipant && " ✓"}
					</button>
				</div>
			</div>

			{isParticipant ? (
				<div className={styles.profile}>
					<PhotoPicker
						photo={photo}
						onPhoto={setPhoto}
						onError={setError}
						className={styles.avatar}
					/>
					<div className={`field ${styles.profileField}`}>
						<label htmlFor="player-name">Ton profil participant</label>
						<input
							id="player-name"
							placeholder="Ton nom"
							value={finalPlayerName}
							onChange={(event) => setPlayerName(event.target.value)}
							autoComplete="off"
							maxLength={30}
						/>
					</div>
				</div>
			) : (
				<MissionInput
					missions={missions}
					onAdd={(mission) => setMissions([...missions, mission])}
					onRemove={removeMission}
				/>
			)}

			<div className="actions">
				{error && <p className="error">{error}</p>}
				<button
					className="button"
					type="submit"
					disabled={isLoading || !isReady}
				>
					{isLoading ? "Création…" : "Créer"}
				</button>
			</div>
		</form>
	);
}
export default CreateGamePage;
