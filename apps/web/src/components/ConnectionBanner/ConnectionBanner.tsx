import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { socket } from "../../socket";
import styles from "./ConnectionBanner.module.css";

// Bandeau affiché en haut de l'écran quand le téléphone perd la connexion au serveur.
// Socket.IO se reconnecte tout seul : on écoute seulement ses événements.
function ConnectionBanner() {
	// true au départ : pas de bandeau pendant le chargement de la page.
	const [isConnected, setIsConnected] = useState(true);

	useEffect(() => {
		const onConnect = () => setIsConnected(true);
		const onDisconnect = () => setIsConnected(false);

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		// Serveur injoignable dès l'ouverture : "disconnect" n'arrive jamais, mais ceci oui.
		socket.on("connect_error", onDisconnect);

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connect_error", onDisconnect);
		};
	}, []);

	if (isConnected) return null;

	// Le portail place le bandeau directement dans <body>, hors de #root,
	// pour échapper aux styles de mise en page de #root > *.
	return createPortal(
		<div className={styles.banner} role="status">
			Connexion perdue… reconnexion en cours
		</div>,
		document.body,
	);
}

export default ConnectionBanner;
