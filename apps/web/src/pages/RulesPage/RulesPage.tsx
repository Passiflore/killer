import styles from "./RulesPage.module.css";

// Règles du jeu, dans l'ordre où le joueur les vit.
const RULES: { title: string; text: string }[] = [
	{
		title: "Rejoins la partie",
		text: "Entre le code donné par l'organisateur (ou scanne son QR code), ton nom et un selfie.",
	},
	{
		title: "Reçois ta cible et ta mission",
		text: "Au lancement, tu reçois une cible et une mission secrètes. Tape pour les afficher, et ne les montre à personne.",
	},
	{
		title: "Piège ta cible",
		text: "Réalise ta mission sur ta cible sans qu'elle se doute de rien, puis appuie sur « J'ai killé ».",
	},
	{
		title: "La victime répond",
		text: "Elle confirme ou conteste. Sans réponse au bout de 10 minutes, le kill est validé. En cas de contestation, l'organisateur tranche.",
	},
	{
		title: "Hérite de sa cible",
		text: "Kill validé : tu récupères la cible et la mission de ta victime, et la chasse continue.",
	},
	{
		title: "Un kill à la fois",
		text: "Impossible de déclarer un kill si toi ou ta cible êtes déjà dans un kill en attente.",
	},
	{
		title: "Mission grillée ?",
		text: "Si ta cible a deviné ta mission, tu peux en changer une seule fois dans la partie.",
	},
	{
		title: "Gagne",
		text: "Le dernier survivant gagne. Si l'heure de fin arrive avant, les survivants sont départagés au nombre de kills.",
	},
];

function RulesPage() {
	return (
		<main>
			<div className="topbar">
				<a className="link" href="/">
					← Retour à l'accueil
				</a>
			</div>

			<div>
				<p className="eyebrow">Dossier d'instruction</p>
				<p className={styles.title}>Comment jouer</p>
			</div>

			<ol className={styles.rules}>
				{RULES.map((rule, index) => (
					<li key={rule.title} className={styles.rule}>
						<span className={styles.number}>
							{String(index + 1).padStart(2, "0")}
						</span>
						<div>
							<p className={styles.ruleTitle}>{rule.title}</p>
							<p className={styles.ruleText}>{rule.text}</p>
						</div>
					</li>
				))}
			</ol>

			<p className="hint">
				Reste discret, garde ton secret
				<br />
				et méfie-toi de tout le monde.
			</p>

			<div className="actions">
				<a className="button" href="/">
					J'ai compris, je joue
				</a>
			</div>
		</main>
	);
}
export default RulesPage;
