import { useState } from "react";
import styles from "./CodeBox.module.css";

function CodeBox({ code }: { code: string }) {
	const [isCopied, setIsCopied] = useState(false);
	const inviteLink = `${window.location.origin}/?code=${code}`;

	async function copyInvite() {
		if (!navigator.clipboard) {
			window.prompt("Copie ce lien :", inviteLink);
			return;
		}
		await navigator.clipboard.writeText(inviteLink);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	}

	return (
		<div className={styles.box}>
			<div>
				<p className="label">Code de la partie</p>
				<p className={styles.code}>{code}</p>
			</div>
			<button type="button" className={styles.copy} onClick={copyInvite}>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					aria-hidden="true"
				>
					<rect x="8" y="8" width="13" height="13" rx="1" />
					<path d="M4 16V4a1 1 0 0 1 1-1h12" />
				</svg>
				{isCopied ? "Copié ✓" : "Copier"}
			</button>
		</div>
	);
}
export default CodeBox;
