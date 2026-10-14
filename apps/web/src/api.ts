import type { ApiError, Me } from "shared";
import { TOKEN_KEY } from "./storage";

// Envoie une action du joueur (avec son badge) et renvoie ses infos à jour.
// En cas de refus, lève une erreur avec le message du serveur.
export async function postAsPlayer(path: string): Promise<Me> {
	let response: Response;
	try {
		response = await fetch(path, {
			method: "POST",
			headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
		});
	} catch {
		throw new Error("Impossible de joindre le serveur. Vérifie ta connexion.");
	}

	const data = await response.json();
	if (!response.ok) {
		throw new Error((data as ApiError).error);
	}
	return data as Me;
}
