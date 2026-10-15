import { useState } from "react";
import styles from "./MissionInput.module.css";

function MissionInput({
	missions,
	onAdd,
	onRemove,
}: {
	missions: string[];
	onAdd: (mission: string) => void;
	onRemove: (index: number) => void;
}) {
	const [draft, setDraft] = useState("");

	function add() {
		const mission = draft.trim();
		if (mission) onAdd(mission);
		setDraft("");
	}

	return (
		<div className="field">
			<label htmlFor="missions">Rajoute des missions</label>
			<textarea
				id="missions"
				className={styles.input}
				placeholder="Rajoute des missions..."
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) {
						event.preventDefault();
						add();
					}
				}}
				onBlur={add}
				enterKeyHint="done"
			/>
			{missions.length > 0 && (
				<ul className={styles.chips}>
					{missions.map((mission, index) => (
						<li key={`${index}-${mission}`} className={styles.chip}>
							<span className={styles.chipText}>{mission}</span>
							<button
								type="button"
								className={styles.chipRemove}
								onClick={() => onRemove(index)}
								aria-label={`Retirer « ${mission} »`}
							>
								×
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
export default MissionInput;
