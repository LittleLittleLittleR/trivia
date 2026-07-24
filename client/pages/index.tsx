import { useState } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../lib/socket";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCreate() {
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit("create_lobby", {}, (res: any) => {
      setLoading(false);
      if (!res?.ok) {
        setError(res?.error || "Could not create lobby");
        return;
      }
      router.push(`/host/${res.code}?token=${res.hostToken}`);
    });
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    
    if (!code || !name) {
      setError("Enter both a lobby code and your name");
      return;
    }

    // check if the name is already taken in the lobby
    const socket = getSocket();
    socket.emit("get_lobby_info", { code }, (res: any) => {
      if (!res?.ok) {
        setError(res?.error || "Could not get lobby info");
        return;
      }
      const names = res.players.map((p: any) => p.name.toLowerCase());
      if (names.includes(name.toLowerCase())) {
        setError("Name already taken in this lobby");
        return;
      }
      joinLobby(code, name);
    });
  }

  function joinLobby(code: string, name: string) {
    setLoading(true);
    setError("");
    const socket = getSocket();
    socket.emit("join_lobby", { code, name }, (res: any) => {
      setLoading(false);
      if (!res?.ok) {
        setError(res?.error || "Could not join lobby");
        return;
      }
      sessionStorage.setItem(`trivia_player_${code}`, JSON.stringify({ playerId: res.playerId, name }));
      router.push(`/player/${code}`);
    });
  }

  return (
    <div className="center-page">
      <div className="brand">🏆 TRIVIA SHOWDOWN</div>
      <div className="subtitle">Host a live buzzer-round trivia game on any devices</div>

      <div className="card">
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleCreate} disabled={loading}>
          Host a New Game
        </button>

        <div className="divider">or join a game</div>

        <div className="field">
          <label>Lobby Code</label>
          <input
            type="text"
            placeholder="e.g. FQ7Z"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={4}
          />
        </div>
        <div className="field">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="e.g. Alex"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={20}
          />
        </div>
        <button className="btn-secondary" style={{ width: "100%" }} onClick={handleJoin} disabled={loading}>
          Join Game
        </button>

        {error && <div className="error-msg">{error}</div>}
      </div>

      <div className="hint">
        No login needed. The host creates a lobby and shares the link/code with players on their own devices.
      </div>
    </div>
  );
}
