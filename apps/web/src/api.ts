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
	let data: unknown;
	try {
		data = await response.json();
	} catch {
		// Réponse qui n'est pas du JSON : souvent une page d'erreur de l'hébergeur
		// pendant un redémarrage du serveur.
		throw new Error("Le serveur ne répond pas correctement. Réessaie dans un instant.");
	}
	if (!response.ok) {
		throw new Error((data as ApiError).error);
	}
	return data;
}

// Envoie des données JSON (formulaires d'accueil, de création, pour rejoindre).
export function postJson(path: string, body: unknown): Promise<unknown> {
	return request(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
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
	method: "GET" | "POST" | "DELETE" = "POST",
	body?: unknown,
): Promise<unknown> {
	return request(path, {
		method,
		headers: { "X-Orga-Code": orgaCode, "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}
