import { useState } from "react";
import agentPortrait from "../../assets/AgentPortrait.png";

function Avatar({
	playerId,
	className,
}: {
	playerId: number;
	className?: string;
}) {
	const [failedId, setFailedId] = useState<number | null>(null);

	return (
		<img
			src={
				failedId === playerId
					? agentPortrait
					: `/api/players/${playerId}/photo`
			}
			alt=""
			className={className}
			onError={() => setFailedId(playerId)}
		/>
	);
}
export default Avatar;
