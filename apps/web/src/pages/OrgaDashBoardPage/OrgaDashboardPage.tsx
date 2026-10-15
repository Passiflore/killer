import { useEffect, useState } from "react";
import type { Contest, Game, Player } from "shared";
import { orgaRequest } from "../../api";
import { socket } from "../../socket";
import { ORGA_CODE_KEY } from "../../storage";
import AdminLobby from "./AdminLobby";

function OrgaLogin({ onLogin }: { onLogin: (orgaCode: string) => void }) {
	const [orgaCode, setOrgaCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		try {
			await orgaRequest("/api/orga/login", orgaCode);
			onLogin(orgaCode);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<h1>Espace orga</h1>
			<label htmlFor="orgaCode">Code orga</label>
			<input
				id="orgaCode"
				type="password"
				value={orgaCode}
				onChange={(event) => setOrgaCode(event.target.value)}
			/>
			<button type="submit">Entrer</button>
			{error && <p>{error}</p>}
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
	const [gameCode, setGameCode] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Les contestations : chargées à l'ouverture, puis à chaque « refresh » du serveur.
	useEffect(() => {
		function loadContests() {
			orgaRequest("/api/orga/contests", orgaCode, "GET")
				.then((data) => setContests(data as Contest[]))
				.catch(console.error);
		}
		loadContests();
		socket.on("refresh", loadContests);
		return () => {
			socket.off("refresh", loadContests);
		};
	}, [orgaCode]);

	useEffect(() => {
		orgaRequest("/api/orga/code", orgaCode, "GET")
			.then((data) => setGameCode((data as { code: string }).code))
			.catch(console.error);
	}, [orgaCode]);

	async function run(path: string) {
		setError(null);
		setIsLoading(true);
		try {
			await orgaRequest(path, orgaCode);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
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

	return (
		<main>
			<h1>Admin</h1>

			{gameCode && (
				<p>
					Code de la partie : {gameCode}
					<br />
					Lien d'invitation : {window.location.origin}/?code={gameCode}
					<br />
					Code orga (pour te reconnecter ailleurs) : {orgaCode}
				</p>
			)}

			{contests.map((contest) => (
				<section key={contest.killId}>
					<p>
						Débat en cours, va voir {contest.chasseurName} et{" "}
						{contest.victimeName}
					</p>
					<p>Mission : {contest.mission}</p>
					<button
						type="button"
						onClick={() => run(`/api/orga/kills/${contest.killId}/accept`)}
						disabled={isLoading}
					>
						Accepte le kill
					</button>
					<button
						type="button"
						onClick={() => run(`/api/orga/kills/${contest.killId}/reject`)}
						disabled={isLoading}
					>
						Renie le kill
					</button>
				</section>
			))}

			<p>Statut : {game.status}</p>
			<h2>{alivePlayers.length} joueurs restants</h2>
			<ul>
				{players.map((player) => (
					<li key={player.id}>
						{player.name}
						{player.status === "ELIMINE" && " 💀"}
					</li>
				))}
			</ul>

			{game.status === "EN_COURS" && (
				<button
					type="button"
					onClick={() => {
						if (window.confirm("Terminer la partie pour tout le monde ?")) {
							run("/api/orga/end");
						}
					}}
					disabled={isLoading}
				>
					Terminer la partie
				</button>
			)}
			{error && <p>{error}</p>}

			<button type="button" onClick={onLogout}>
				Changer de code orga
			</button>
		</main>
	);
}

// Demande le code orga s'il n'est pas déjà connu, puis affiche le tableau de bord.
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

	function logout() {
		localStorage.removeItem(ORGA_CODE_KEY);
		setOrgaCode(null);
	}

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
