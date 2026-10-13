import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents } from "shared";

export const socket: Socket<ServerToClientEvents, Record<string, never>> = io({
	autoConnect: false,
});
