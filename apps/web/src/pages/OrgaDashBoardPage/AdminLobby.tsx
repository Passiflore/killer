import { useEffect, useState } from "react";
import type { CustomMission, Game, Player } from "shared";
import { orgaRequest } from "../../api";
import CodeBox from "../../components/CodeBox/CodeBox";
import LobbyHeader from "../../components/LobbyHeader/LobbyHeader";
import MissionInput from "../../components/MissionInput/MissionInput";
import PlayerGrid from "../../components/PlayerGrid/PlayerGrid";
import styles from "./AdminLobby.module.css";
import { errorMessage } from "../../errorMessage";

function AdminLobby({
	game,
	players,
	orgaCode,
	gameCode,
	isParticipant,
}: {
	game: Game;
	players: Player[];
	orgaCode: string;
	gameCode: string | null;
	isParticipant: boolean;
}) {
	const [missions, setMissions] = useState<CustomMission[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (isParticipant) return;
		orgaRequest("/api/orga/missions", orgaCode, "GET")
			.then((data) => setMissions(data as CustomMission[]))
			.catch(console.error);
	}, [orgaCode, isParticipant]);

	async function call(action: () => Promise<void>) {
		setError(null);
		setIsLoading(true);
		try {
			await action();
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setIsLoading(false);
		}
	}

	function addMission(text: string) {
		call(async () => {
			const list = await orgaRequest("/api/orga/missions", orgaCode, "POST", {
				text,
			});
			setMissions(list as CustomMission[]);
		});
	}

	function removeMission(index: number) {
		call(async () => {
			const list = await orgaRequest(
				`/api/orga/missions/${missions[index].id}`,
				orgaCode,
				"DELETE",
			);
			setMissions(list as CustomMission[]);
		});
	}

	function start() {
		call(async () => {
			await orgaRequest("/api/game/start", orgaCode);
		});
	}

	return (
		<main>
			<LobbyHeader gameName={game.name} playerCount={players.length} />

			{!isParticipant && (
				<MissionInput
					missions={missions.map((mission) => mission.text)}
					onAdd={addMission}
					onRemove={removeMission}
				/>
			)}

			<PlayerGrid players={players} />

			<div className={`actions ${styles.footer}`}>
				{isParticipant && (
					<p className={styles.note}>
						Tu es organisateur et joueur.
						<br />
						Tes missions seront révélées au lancement.
					</p>
				)}
				{gameCode && <CodeBox code={gameCode} />}
				{error && <p className="error">{error}</p>}
				<button
					type="button"
					className="button"
					onClick={start}
					disabled={isLoading || players.length < 2}
				>
					Lancer la partie
				</button>
				<p className="hint center">Code orga : {orgaCode}</p>
			</div>
		</main>
	);
}
export default AdminLobby;
