import { useRef } from "react";
import agentPortrait from "../../assets/AgentPortrait.png";
import { resizePhoto } from "../../photo";
import styles from "./PhotoPicker.module.css";

function PhotoPicker({
	photo,
	onPhoto,
	onError,
	className,
}: {
	photo: string | null;
	onPhoto: (photo: string) => void;
	onError: (message: string) => void;
	className?: string;
}) {
	const fileInput = useRef<HTMLInputElement>(null);

	async function handleFile(file: File | undefined) {
		if (!file) return;
		try {
			onPhoto(await resizePhoto(file));
		} catch (err) {
			onError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div className={`${styles.picker} ${className ?? ""}`}>
			<img src={photo ?? agentPortrait} alt="" className={styles.portrait} />
			<input
				ref={fileInput}
				type="file"
				accept="image/*"
				capture="user"
				hidden
				onChange={(event) => handleFile(event.target.files?.[0])}
			/>
			<button
				type="button"
				className={styles.edit}
				aria-label="Prendre une photo"
				onClick={() => fileInput.current?.click()}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
					<path d="m15 5 4 4" />
				</svg>
			</button>
		</div>
	);
}
export default PhotoPicker;
