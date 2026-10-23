// Transforme une erreur attrapée par un catch en texte à afficher.
// En TypeScript, `err` est de type `unknown` : ce n'est pas forcément une Error.
export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
