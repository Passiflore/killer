import styles from "./BrandBar.module.css";

function BrandBar({
	title,
	gameName,
}: {
	title: string;
	gameName: string;
}) {
	return (
		<div className={styles.bar}>
			<p className={styles.title}>{title}</p>
			<p className="hint">[{gameName}]</p>
		</div>
	);
}
export default BrandBar;
