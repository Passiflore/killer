import { useState } from "react";
import type { Me } from "shared";
import "./App.css";
import JoinPage from "./pages/JoinPage";

function App() {
	const [me, setMe] = useState<Me | null>(null);

	if (!me) {
		return <JoinPage onJoined={setMe} />;
	}

	return <p>Bienvenue {me.name}</p>;
}

export default App;
