import type { Me } from "shared";

function EliminatedPage({ me }: { me: Me }) {
	return (
		<main>
			<h1>
				Tu t'es fait éliminé(e)
				{me.eliminatedBy && <> par {me.eliminatedBy}</>}
			</h1>
			<p>
				avec {me.killCount} kill{me.killCount > 1 && "s"} à ton actif
			</p>
		</main>
	);
}
export default EliminatedPage;
