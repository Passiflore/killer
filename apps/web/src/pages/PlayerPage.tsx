import type { Me } from "shared";

// Version provisoire : l'étape 6 ajoutera le masquage et l'appui long.
function PlayerPage({ me }: { me: Me }) {
	if (me.status === "ELIMINE") {
		return <p>Tu as été éliminé·e 💀</p>;
	}

	if (!me.target) {
		return <p>Chargement de ta mission…</p>;
	}

	return (
		<main>
			<h1>La partie a commencé !</h1>
			<p>Ta cible : {me.target.name}</p>
			<p>Ta mission : {me.mission}</p>
		</main>
	);
}
export default PlayerPage;
