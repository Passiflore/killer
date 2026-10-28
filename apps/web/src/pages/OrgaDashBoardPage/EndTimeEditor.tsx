import { useState } from "react";
import type { Game } from "shared";
import Chrono from "../../components/Chrono/Chrono";
import styles from "./OrgaDashboardPage.module.css";
import { toTimestamp } from "../../time";

function toTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString("fr-FR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function EndTimeEditor({
	game,
	onSave,
}: {
	game: Game;
	onSave: (endsAt: number | null) => Promise<void>;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [time, setTime] = useState("");

	function startEditing() {
		setTime(game.endsAt ? toTime(game.endsAt) : "");
		setIsEditing(true);
	}

	async function save() {
		await onSave(toTimestamp(time));
		setIsEditing(false);
	}

	return (
		<section className={styles.timer}>
			<div className={styles.timerRow}>
				<Chrono game={game} />
				{!isEditing && (
					<button type="button" className="link" onClick={startEditing}>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
						</svg>
						Modifier
					</button>
				)}
			</div>

			{isEditing ? (
				<div className={styles.timerEdit}>
					<input
						type="time"
						value={time}
						onChange={(event) => setTime(event.target.value)}
						aria-label="Heure de fin"
					/>
					<button type="button" className="button" onClick={save}>
						OK
					</button>
					<button
						type="button"
						className="button secondary"
						onClick={() => setIsEditing(false)}
					>
						Annuler
					</button>
				</div>
			) : (
				<p className="hint">
					{game.endsAt ? `Heure de fin - ${toTime(game.endsAt)}` : "Pas d'heure de fin"}
				</p>
			)}
		</section>
	);
}
export default EndTimeEditor;
