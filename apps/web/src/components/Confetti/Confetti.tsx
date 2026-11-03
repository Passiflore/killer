import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import styles from "./Confetti.module.css";

const COLORS = ["#d92c32", "#ece9df", "#f2c94c", "#6fcf97", "#56ccf2"];
const COUNT = 80;

// Tire au hasard la position, la couleur et la vitesse de chaque confetti.
function randomPieces() {
	return Array.from({ length: COUNT }, () => ({
		left: Math.random() * 100,
		color: COLORS[Math.floor(Math.random() * COLORS.length)],
		delay: Math.random() * 1.5,
		duration: 2.5 + Math.random() * 2,
		drift: (Math.random() - 0.5) * 120,
		isRound: Math.random() < 0.3,
	}));
}

// Pluie de confettis par-dessus l'écran. Chaque confetti tombe une seule fois.
function Confetti() {
	// Tiré une seule fois au premier affichage : les confettis ne bougent pas à chaque rendu.
	const [pieces] = useState(randomPieces);

	// Réglage « Réduire les animations » du téléphone : pas de confettis.
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return null;
	}

	// Rendu directement dans <body> : l'animation d'entrée de l'écran (transform) décalerait
	// sinon le position: fixed pendant ses 0,3 s.
	return createPortal(
		<div className={styles.confetti} aria-hidden="true">
			{pieces.map((piece, index) => (
				<span
					key={index}
					className={`${styles.piece} ${piece.isRound ? styles.round : ""}`}
					style={
						{
							left: `${piece.left}%`,
							background: piece.color,
							animationDelay: `${piece.delay}s`,
							animationDuration: `${piece.duration}s`,
							"--drift": `${piece.drift}px`,
						} as CSSProperties
					}
				/>
			))}
		</div>,
		document.body,
	);
}
export default Confetti;
