import type { ApiError, Me } from "shared";
import { TOKEN_KEY } from "./storage";

// Appelle l'API. Renvoie la réponse JSON (ou null si elle est vide).
// En cas de refus, lève une erreur avec le message du serveur.
async function request(path: string, init: RequestInit): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(path, init);
	} catch {
		throw new Error("Impossible de joindre le serveur. Vérifie ta connexion.");
	}

	if (response.status === 204) return null;
	const data = await response.json();
	if (!response.ok) {
		throw new Error((data as ApiError).error);
	}
	return data;
}

// Envoie une action du joueur (avec son badge) et renvoie ses infos à jour.
export async function postAsPlayer(path: string): Promise<Me> {
	return (await request(path, {
		method: "POST",
		headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
	})) as Me;
}

// Requête de l'orga, avec son code secret.
export function orgaRequest(
	path: string,
	orgaCode: string,
	method: "GET" | "POST" = "POST",
): Promise<unknown> {
	return request(path, { method, headers: { "X-Orga-Code": orgaCode } });
}
