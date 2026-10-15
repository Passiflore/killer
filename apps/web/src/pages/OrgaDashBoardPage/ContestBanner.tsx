import type { Contest } from "shared";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./OrgaDashboardPage.module.css";

function ContestBanner({
	contest,
	isLoading,
	onDecide,
}: {
	contest: Contest;
	isLoading: boolean;
	onDecide: (decision: "accept" | "reject") => void;
}) {
	return (
		<section className={styles.contest}>
			<p className={styles.contestTitle}>Débat en cours / Action requise</p>
			<div className={styles.contestBody}>
				<div className={styles.contestPhotos}>
					<Avatar playerId={contest.chasseurId} className={styles.smallPhoto} />
					<Avatar playerId={contest.victimeId} className={styles.smallPhoto} />
				</div>
				<p>
					Va voir {contest.victimeName} et {contest.chasseurName}.
					<br />À toi de trancher.
				</p>
			</div>
			<p className={styles.contestMission}>Mission : {contest.mission}</p>
			<div className={styles.contestActions}>
				<button
					type="button"
					className={styles.accept}
					onClick={() => onDecide("accept")}
					disabled={isLoading}
				>
					Accepte le kill
				</button>
				<button
					type="button"
					className={styles.reject}
					onClick={() => onDecide("reject")}
					disabled={isLoading}
				>
					Renie le kill
				</button>
			</div>
		</section>
	);
}
export default ContestBanner;
