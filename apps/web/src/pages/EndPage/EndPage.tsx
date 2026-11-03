import { useEffect, useState } from "react";
import type { ApiError, Game, PlayerResult, Results } from "shared";
import { orgaRequest } from "../../api";
import EndGame from "../../assets/EndGame";
import Avatar from "../../components/Avatar/Avatar";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import Confetti from "../../components/Confetti/Confetti";
import { ORGA_CODE_KEY, TOKEN_KEY } from "../../storage";
import styles from "./EndPage.module.css";
import { errorMessage } from "../../errorMessage";

function duration(game: Game): string {
	const minutes = Math.max(
		0,
		Math.round(((game.endedAt ?? Date.now()) - (game.startedAt ?? Date.now())) / 60_000),
	);
	const hours = Math.floor(minutes / 60);
	return hours > 0
		? `${hours}h${String(minutes % 60).padStart(2, "0")}`
		: `${minutes} min`;
}

function describe(mission: string): string {
	const match = mission.match(/^Fais-lui (.*)$/i);
	return match ? `Lui a fait ${match[1]}` : mission;
}

function kills(count: number) {
	return `${count} kill${count > 1 ? "s" : ""}`;
}

function AwardCard({
	title,
	subtitle,
	playerId,
	playerName,
}: {
	title: string;
	subtitle: string;
	playerId: number;
	playerName: string;
}) {
	return (
		<div className={styles.award}>
			<p className="eyebrow">{title}</p>
			<div className={styles.awardPlayer}>
				<Avatar playerId={playerId} className={styles.smallPhoto} />
				<span className={styles.awardName}>{playerName}</span>
			</div>
			<p className={styles.awardSubtitle}>{subtitle}</p>
		</div>
	);
}

// meId : le joueur qui regarde cet écran (null pour un orga qui ne joue pas).
function EndPage({ game, meId }: { game: Game; meId: number | null }) {
	const [results, setResults] = useState<Results | null>(null);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const orgaCode = localStorage.getItem(ORGA_CODE_KEY);

	// L'orga efface la partie terminée, puis repart sur le formulaire de création.
	async function reset() {
		if (!orgaCode) return;
		setError(null);
		setIsLoading(true);
		try {
			await orgaRequest("/api/orga/reset", orgaCode);
			localStorage.removeItem(ORGA_CODE_KEY);
			localStorage.removeItem(TOKEN_KEY);
			window.location.href = "/orga";
		} catch (err) {
			setError(errorMessage(err));
			setIsLoading(false);
			setIsConfirming(false);
		}
	}

	// Demande les résultats au serveur. En cas d'échec, on affiche l'erreur
	// au lieu de rester bloqué sur « Chargement… ».
	function loadResults() {
		fetch("/api/results")
			.then(async (response) => {
				const data = await response.json();
				if (!response.ok) throw new Error((data as ApiError).error);
				setResults(data as Results);
			})
			.catch((err) => {
				console.error(err);
				setLoadError(errorMessage(err));
			});
	}

	function retry() {
		setLoadError(null);
		loadResults();
	}

	useEffect(loadResults, []);

	if (loadError) {
		return (
			<main>
				<p className="error">
					Impossible de charger les résultats : {loadError}
				</p>
				<button type="button" className="button" onClick={retry}>
					Réessayer
				</button>
			</main>
		);
	}

	if (!results) {
		return <p>Chargement des résultats…</p>;
	}

	const winnerIds = new Set(results.winners.map((winner) => winner.id));
	const survivors = results.ranking
		.filter((player) => player.status === "VIVANT")
		.sort((a, b) => Number(winnerIds.has(b.id)) - Number(winnerIds.has(a.id)));
	const topKillers: PlayerResult[] = [...results.ranking]
		.filter((player) => player.killCount > 0)
		.sort((a, b) => b.killCount - a.killCount)
		.slice(0, 3);
	const firstKill = results.kills[0];

	return (
		<main>
			{meId !== null && winnerIds.has(meId) && <Confetti />}
			<div>
				<p className="eyebrow">[{game.name}] / Dossier classé</p>
				<p className={`${styles.title} stamp`}>Fin de partie</p>
			</div>

			<div className={styles.illustration}>
				<EndGame />
			</div>

			<div className={styles.stats}>
				<div>
					<p className="label">
						Durée de
						<br />
						la partie
					</p>
					<p className={styles.duration}>{duration(game)}</p>
				</div>
				<div>
					<p className="label">Joueurs encore en vie</p>
					<ul className={styles.survivors}>
						{survivors.map((player) => (
							<li key={player.id} className={styles.survivor}>
								<Avatar playerId={player.id} className={styles.smallPhoto} />
								<span>
									{winnerIds.has(player.id) && "👑 "}
									{player.name}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>

			{topKillers.length > 0 && (
				<section className={styles.section}>
					<p className={styles.sectionTitle}>Tueurs en série</p>
					<ol className={styles.ranking}>
						{topKillers.map((player, index) => (
							<li key={player.id} className={styles.rank}>
								<span className={styles.rankNumber}>
									{String(index + 1).padStart(2, "0")}
								</span>
								<Avatar playerId={player.id} className={styles.smallPhoto} />
								<span className={styles.rankName}>{player.name}</span>
								<span className={styles.rankKills}>
									{kills(player.killCount)}
								</span>
							</li>
						))}
					</ol>

					{firstKill && (
						<div className={styles.awards}>
							<AwardCard
								title="Lucky Luke"
								subtitle="Killer le plus rapide"
								playerId={firstKill.chasseurId}
								playerName={firstKill.chasseurName}
							/>
							<AwardCard
								title="Premier à tomber"
								subtitle="Un alibi trop fragile"
								playerId={firstKill.victimeId}
								playerName={firstKill.victimeName}
							/>
						</div>
					)}
				</section>
			)}

			{results.kills.length > 0 && (
				<section className={styles.section}>
					<p className={styles.sectionTitle}>Les missions</p>
					<ul className={styles.missions}>
						{results.kills.map((kill) => (
							<li key={kill.killId} className={styles.mission}>
								<p className="eyebrow">
									{kill.chasseurName} → {kill.victimeName}
								</p>
								<p>{describe(kill.mission)}</p>
							</li>
						))}
					</ul>
				</section>
			)}

			{orgaCode && (
				<div className="actions">
					{error && <p className="error">{error}</p>}
					<button
						type="button"
						className="button"
						onClick={() => setIsConfirming(true)}
					>
						Nouvelle partie
					</button>
				</div>
			)}

			{isConfirming && (
				<ConfirmModal
					tag="Nouvelle partie"
					title="Effacer cette partie ?"
					detail="Joueurs, kills et résultats seront effacés pour tout le monde."
					confirmLabel="Confirmer et effacer"
					isLoading={isLoading}
					onConfirm={reset}
					onCancel={() => setIsConfirming(false)}
				/>
			)}
		</main>
	);
}
export default EndPage;
