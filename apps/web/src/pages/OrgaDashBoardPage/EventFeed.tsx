import type { GameEvent, Player } from "shared";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./OrgaDashboardPage.module.css";

function elapsed(from: number | null, to: number): string {
	const minutes = Math.max(0, Math.floor((to - (from ?? to)) / 60_000));
	const hours = Math.floor(minutes / 60);
	return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function describe(event: GameEvent): string {
	const match = event.mission.match(/^Fais-lui (.*)$/i);
	return match
		? `A réussi à piéger ${event.victimeName}, et lui faire ${match[1]}`
		: `A réussi à piéger ${event.victimeName} : ${event.mission}`;
}

function EventFeed({
	events,
	alivePlayers,
	startedAt,
}: {
	events: GameEvent[];
	alivePlayers: Player[];
	startedAt: number | null;
}) {
	const [first, second] = alivePlayers;

	return (
		<section>
			<h2 className={styles.sectionTitle}>Fil d'événements</h2>

			{alivePlayers.length === 2 && (
				<div className={styles.duel}>
					<Avatar playerId={first.id} className={styles.smallPhoto} />
					<span className={styles.versus}>VS</span>
					<Avatar playerId={second.id} className={styles.smallPhoto} />
					<div>
						<p className="eyebrow">Dernier duel</p>
						<p>
							{first.name} et {second.name}
						</p>
					</div>
				</div>
			)}

			{events.length === 0 ? (
				<p className={styles.empty}>Aucun kill pour l'instant.</p>
			) : (
				<ul className={styles.events}>
					{events.map((event) => (
						<li key={event.killId} className={styles.event}>
							<div className={styles.eventHeader}>
								<span className={styles.eventName}>{event.chasseurName}</span>
								<span className={styles.eventTime}>
									{elapsed(startedAt, event.resolvedAt)}
								</span>
							</div>
							<p>{describe(event)}</p>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
export default EventFeed;
