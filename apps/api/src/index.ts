import express from "express";
import { Server } from "socket.io";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3000;
const io = new Server(httpServer);

io.on("connection", (socket) => {
	console.log(socket.id, "socket.id");
});

app.use(express.json());

app.get("/healthz", (request, response) => {
	response.json({ ok: true });
});

httpServer.listen(port, () => {
	console.log(`Serveur prêt sur http://localhost:${port}`);
});
