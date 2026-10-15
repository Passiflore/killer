import { useEffect, useState } from "react";
import type { Game } from "shared";
import styles from "./Chrono.module.css";

function format(milliseconds: number): string {
	const total = Math.max(0, Math.floor(milliseconds / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	return [hours, minutes, seconds]
		.map((value) => String(value).padStart(2, "0"))
		.join(":");
}

function Chrono({ game }: { game: Game }) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const value = game.endsAt
		? game.endsAt - now
		: now - (game.startedAt ?? now);

	return <p className={styles.chrono}>{format(value)}</p>;
}
export default Chrono;
