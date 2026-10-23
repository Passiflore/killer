import { useCallback, useEffect, useState } from "react";
import type { Contest, Game, GameEvent, Player } from "shared";
import { orgaRequest } from "../../api";
import BrandBar from "../../components/BrandBar/BrandBar";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { socket } from "../../socket";
import { ORGA_CODE_KEY } from "../../storage";
import AdminLobby from "./AdminLobby";
import ContestBanner from "./ContestBanner";
import EndTimeEditor from "./EndTimeEditor";
import EventFeed from "./EventFeed";
import styles from "./OrgaDashboardPage.module.css";
import PlayersRow from "./PlayersRow";
import { errorMessage } from "../../errorMessage";

function OrgaLogin({ onLogin }: { onLogin: (orgaCode: string) => void }) {
	const [orgaCode, setOrgaCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		try {
			await orgaRequest("/api/orga/login", orgaCode.trim().toUpperCase());
			onLogin(orgaCode.trim().toUpperCase());
		} catch (err) {
			setError(errorMessage(err));
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<div className="topbar">
				<a className="link" href="/">
					← Retour à l'accueil
				</a>
			</div>
			<p className={styles.adminTitle}>Admin</p>
			<div className="field">
				<label htmlFor="orgaCode">Code orga</label>
				<input
					id="orgaCode"
					value={orgaCode}
					onChange={(event) => setOrgaCode(event.target.value)}
					autoCapitalize="characters"
					autoComplete="off"
					aria-invalid={error !== null}
				/>
				{error && <p className="error">{error}</p>}
			</div>
			<div className="actions">
				<button type="submit" className="button" disabled={!orgaCode.trim()}>
					Entrer
				</button>
			</div>
		</form>
	);
}

function OrgaDashboard({
	game,
	players,
	orgaCode,
	isParticipant,
	onLogout,
}: {
	game: Game;
	players: Player[];
	orgaCode: string;
	isParticipant: boolean;
	onLogout: () => void;
}) {
	const [contests, setContests] = useState<Contest[]>([]);
	const [events, setEvents] = useState<GameEvent[]>([]);
	const [gameCode, setGameCode] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [confirming, setConfirming] = useState<
		{ type: "end" } | { type: "remove"; player: Player } | null
	>(null);

	useEffect(() => {
		function load() {
			orgaRequest("/api/orga/contests", orgaCode, "GET")
				.then((data) => setContests(data as Contest[]))
				.catch(console.error);
			if (!isParticipant) {
				orgaRequest("/api/orga/events", orgaCode, "GET")
					.then((data) => setEvents(data as GameEvent[]))
					.catch(console.error);
			}
		}
		load();
		socket.on("refresh", load);
		return () => {
			socket.off("refresh", load);
		};
	}, [orgaCode, isParticipant]);

	useEffect(() => {
		orgaRequest("/api/orga/code", orgaCode, "GET")
			.then((data) => setGameCode((data as { code: string }).code))
			.catch((err) => {
				// Code gardé d'une ancienne partie : on l'oublie et on redemande le code.
				if (err instanceof Error && err.message === "Code orga incorrect.") {
					onLogout();
				} else {
					console.error(err);
				}
			});
	}, [orgaCode, onLogout]);

	async function run(path: string, body?: unknown) {
		setError(null);
		setIsLoading(true);
		try {
			await orgaRequest(path, orgaCode, "POST", body);
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setIsLoading(false);
		}
	}

	if (game.status === "LOBBY") {
		return (
			<AdminLobby
				game={game}
				players={players}
				orgaCode={orgaCode}
				gameCode={gameCode}
				isParticipant={isParticipant}
			/>
		);
	}

	const alivePlayers = players.filter((player) => player.status === "VIVANT");

	async function confirm() {
		if (!confirming) return;
		await run(
			confirming.type === "end"
				? "/api/orga/end"
				: `/api/orga/players/${confirming.player.id}/remove`,
		);
		setConfirming(null);
	}

	return (
		<main>
			{contests.map((contest) => (
				<ContestBanner
					key={contest.killId}
					contest={contest}
					isLoading={isLoading}
					onDecide={(decision) =>
						run(`/api/orga/kills/${contest.killId}/${decision}`)
					}
				/>
			))}

			<BrandBar title="Admin" gameName={game.name} />

			{isParticipant && (
				<a className="button" href="/">
					Retour au jeu
				</a>
			)}

			<EndTimeEditor
				game={game}
				onSave={(endsAt) => run("/api/orga/ends-at", { endsAt })}
			/>

			<PlayersRow
				players={alivePlayers}
				onRemove={(player) => setConfirming({ type: "remove", player })}
			/>

			{!isParticipant && (
				<EventFeed
					events={events}
					alivePlayers={alivePlayers}
					startedAt={game.startedAt}
				/>
			)}

			<div className="actions">
				{error && <p className="error">{error}</p>}
				<button
					type="button"
					className="button secondary"
					onClick={() => setConfirming({ type: "end" })}
					disabled={isLoading}
				>
					Terminer la partie
				</button>
				<p className="hint center">
					Code orga : {orgaCode} ·{" "}
					<button type="button" className={styles.logout} onClick={onLogout}>
						changer
					</button>
				</p>
			</div>

			{confirming?.type === "end" && (
				<ConfirmModal
					tag="Clôture"
					title="Terminer la partie ?"
					detail="Les missions seront clôturées et les résultats révélés à tous."
					confirmLabel="Confirmer et terminer"
					cancelLabel="Annuler, continuer la partie"
					isLoading={isLoading}
					onConfirm={confirm}
					onCancel={() => setConfirming(null)}
				/>
			)}
			{confirming?.type === "remove" && (
				<ConfirmModal
					tag="Supprimer"
					title="Supprimer ce joueur ?"
					detail={`${confirming.player.name} sera retiré(e) de la partie.`}
					confirmLabel="Confirmer et supprimer"
					isLoading={isLoading}
					onConfirm={confirm}
					onCancel={() => setConfirming(null)}
				/>
			)}
		</main>
	);
}

function OrgaDashboardPage({
	game,
	players,
	isParticipant,
}: {
	game: Game;
	players: Player[];
	isParticipant: boolean;
}) {
	const [orgaCode, setOrgaCode] = useState(() =>
		localStorage.getItem(ORGA_CODE_KEY),
	);

	function login(code: string) {
		localStorage.setItem(ORGA_CODE_KEY, code);
		setOrgaCode(code);
	}

	// useCallback : fonction stable, pour ne pas relancer les effets qui en dépendent.
	const logout = useCallback(() => {
		localStorage.removeItem(ORGA_CODE_KEY);
		setOrgaCode(null);
	}, []);

	if (!orgaCode) {
		return <OrgaLogin onLogin={login} />;
	}
	return (
		<OrgaDashboard
			game={game}
			players={players}
			orgaCode={orgaCode}
			isParticipant={isParticipant}
			onLogout={logout}
		/>
	);
}
export default OrgaDashboardPage;
