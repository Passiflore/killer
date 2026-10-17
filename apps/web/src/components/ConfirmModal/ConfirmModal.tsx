import { useEffect } from "react";
import SpyQuestion from "../../assets/SpyQuestion";
import styles from "./ConfirmModal.module.css";

function ConfirmModal({
	tag,
	title,
	detail,
	confirmLabel,
	cancelLabel = "Annuler",
	isLoading,
	onConfirm,
	onCancel,
}: {
	tag: string;
	title: string;
	detail?: string;
	confirmLabel: string;
	cancelLabel?: string;
	isLoading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") onCancel();
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onCancel]);

	return (
		<div className={styles.backdrop} onClick={onCancel}>
			<div
				className={styles.modal}
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirm-title"
				onClick={(event) => event.stopPropagation()}
			>
				<p className="eyebrow">Action irréversible / {tag}</p>
				<div className={styles.illustration}>
					<SpyQuestion />
				</div>
				<p id="confirm-title" className={styles.title}>
					{title}
				</p>
				<p className={styles.text}>
					Cette action est irréversible, tu es sûr(e) ?{detail && ` ${detail}`}
				</p>
				<button
					type="button"
					className="button"
					onClick={onConfirm}
					disabled={isLoading}
				>
					{confirmLabel}
				</button>
				<button type="button" className={styles.cancel} onClick={onCancel}>
					{cancelLabel}
				</button>
			</div>
		</div>
	);
}
export default ConfirmModal;
