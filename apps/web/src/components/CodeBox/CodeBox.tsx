import { useState } from "react";
import QRCode from "react-qr-code";
import styles from "./CodeBox.module.css";

function CodeBox({ code }: { code: string }) {
	const [isCopied, setIsCopied] = useState(false);
	const [showQr, setShowQr] = useState(false);
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
			<div className={styles.buttons}>
				<button type="button" className={styles.copy} onClick={() => setShowQr(true)}>
					<svg
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						aria-hidden="true"
					>
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
						<path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
					</svg>
					QR
				</button>
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

			{/* QR en grand, sur fond blanc pour qu'il se scanne bien même dans le noir. */}
			{showQr && (
				<button
					type="button"
					className={styles.overlay}
					onClick={() => setShowQr(false)}
					aria-label="Fermer le QR code"
				>
					<span className={styles.qr}>
						<QRCode value={inviteLink} size={256} />
					</span>
					<span className={styles.qrCode}>{code}</span>
					<span className={styles.qrHint}>Scanne pour rejoindre · touche pour fermer</span>
				</button>
			)}
		</div>
	);
}
export default CodeBox;
