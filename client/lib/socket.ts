import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// One socket per browser tab, reused across page navigations so the
// server keeps associating this connection with the same host/player.
export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
    socket = io(url, { autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}
