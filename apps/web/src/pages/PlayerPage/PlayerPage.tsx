import { useState } from "react";
import type { Game, Me, Player } from "shared";
import { postAsPlayer } from "../../api";
import Avatar from "../../components/Avatar/Avatar";
import BrandBar from "../../components/BrandBar/BrandBar";
import Chrono from "../../components/Chrono/Chrono";
import { ORGA_CODE_KEY } from "../../storage";
import styles from "./PlayerPage.module.css";

function EyeIcon({ crossed }: { crossed: boolean }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
			<circle cx="12" cy="12" r="3" />
			{crossed && <path d="m3 3 18 18" />}
		</svg>
	);
}

function RevealButton({
	isShown,
	onClick,
}: {
	isShown: boolean;
	onClick: () => void;
}) {
	return (
		<button type="button" className={styles.reveal} onClick={onClick}>
			<EyeIcon crossed={isShown} />
			{isShown ? "Masquer l'info" : "Montrer l'info"}
		</button>
	);
}

function PlayerPage({
	me,
	game,
	players,
	onMeChange,
}: {
	me: Me;
	game: Game;
	players: Player[];
	onMeChange: (me: Me) => void;
}) {
	const [showTarget, setShowTarget] = useState(false);
	const [showMission, setShowMission] = useState(false);
	const [seenTargetId, setSeenTargetId] = useState(me.target?.id);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const alivePlayers = players.filter((player) => player.status === "VIVANT");
	const isOrga = localStorage.getItem(ORGA_CODE_KEY) !== null;

	if (!me.target) {
		return <p>Chargement de ta mission…</p>;
	}
	const target = me.target;
	const isNewTarget = target.id !== seenTargetId;

	function toggleTarget() {
		setShowTarget(!showTarget);
		setSeenTargetId(target.id);
	}

	async function handleKill() {
		if (!window.confirm(`Tu confirmes avoir eu ${target.name} ?`)) return;
		setError(null);
		setIsLoading(true);
		try {
			onMeChange(await postAsPlayer("/api/kills"));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	}

	async function handleLeave() {
		if (!window.confirm("Quitter la partie ? Tu ne pourras pas revenir.")) {
			return;
		}
		setError(null);
		try {
			onMeChange(await postAsPlayer("/api/me/leave"));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<main>
			<BrandBar title="Killer" gameName={game.name} />

			{isOrga && (
				<a className="button" href="/orga">
					Portail admin
				</a>
			)}

			<div>
				<Chrono game={game} />
				<p className={styles.remaining}>
					{alivePlayers.length} joueur{alivePlayers.length > 1 && "s"} restant
					{alivePlayers.length > 1 && "s"}
				</p>
			</div>

			<section className={styles.card}>
				<div className={styles.cardHeader}>
					<span className={styles.confidential}>Confidentiel</span>
					<span className={styles.cardMuted}>Permission de tuer</span>
				</div>

				<div className={styles.block}>
					<div className={styles.blockHeader}>
						<span className={styles.cardMuted}>
							01 / Ta cible
							{isNewTarget && <span className={styles.new}>Nouvelle</span>}
						</span>
						<RevealButton isShown={showTarget} onClick={toggleTarget} />
					</div>
					<div
						className={`${styles.target} ${showTarget ? "" : styles.hidden}`}
						aria-hidden={!showTarget}
					>
						<Avatar playerId={target.id} className={styles.targetPhoto} />
						<p className={styles.targetName}>{target.name}</p>
					</div>
				</div>

				<div className={styles.block}>
					<div className={styles.blockHeader}>
						<span className={styles.cardMuted}>02 / Ta mission</span>
						<RevealButton
							isShown={showMission}
							onClick={() => setShowMission(!showMission)}
						/>
					</div>
					<p
						className={`${styles.mission} ${showMission ? "" : styles.hidden}`}
						aria-hidden={!showMission}
					>
						{me.mission}
					</p>
				</div>
			</section>

			<p className="hint">
				Pour tes beaux yeux seulement.
				<br />
				Ne dévoile à personne ni ta cible,
				<br />
				ni ta mission.
			</p>

			<div className="actions">
				{error && <p className="error">{error}</p>}
				{me.huntingKill ? (
					<button type="button" className="button" disabled>
						Kill en attente de validation
					</button>
				) : (
					<button
						type="button"
						className="button secondary"
						onClick={handleKill}
						disabled={isLoading}
					>
						J'ai killé
					</button>
				)}
				<button type="button" className={styles.leave} onClick={handleLeave}>
					Quitter la partie
				</button>
			</div>
		</main>
	);
}
export default PlayerPage;
