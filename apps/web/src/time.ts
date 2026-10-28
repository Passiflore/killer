// Transforme une heure "HH:MM" (champ <input type="time">) en timestamp.
// Si l'heure est déjà passée aujourd'hui, c'est celle de demain (ex. 01:00 saisi à 22h).
export function toTimestamp(time: string): number | null {
	if (!time) return null;
	const [hours, minutes] = time.split(":").map(Number);
	const date = new Date();
	date.setHours(hours, minutes, 0, 0);
	if (date.getTime() <= Date.now()) {
		date.setDate(date.getDate() + 1);
	}
	return date.getTime();
}
