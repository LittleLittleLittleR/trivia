import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../../lib/socket";
import { PlayerView } from "../../lib/types";

export default function PlayerPage() {
  const router = useRouter();
  const { code } = router.query as { code?: string };
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !code) return;
    const socket = getSocket();

    function onState(v: PlayerView) {
      setView(v);
    }
    function onEnded() {
      if (code) sessionStorage.removeItem(`trivia_player_${code}`);
      router.push("/");
    }
    socket.on("state", onState);
    socket.on("game_ended", onEnded);

    const stored = sessionStorage.getItem(`trivia_player_${code}`);
    if (stored) {
      const { playerId: pid } = JSON.parse(stored);
      setPlayerId(pid);
      socket.emit("player_rejoin", { code, playerId: pid }, (res: any) => {
        if (!res?.ok) setNeedsName(true);
      });
    } else {
      setNeedsName(true);
    }

    return () => {
      socket.off("state", onState);
      socket.off("game_ended", onEnded);
    };
  }, [router.isReady, code]);

  function handleJoin() {
    const name = nameInput.trim();
    if (!name || !code) return;
    const socket = getSocket();
    socket.emit("join_lobby", { code, name }, (res: any) => {
      if (!res?.ok) {
        setError(res?.error || "Could not join lobby");
        return;
      }
      sessionStorage.setItem(`trivia_player_${code}`, JSON.stringify({ playerId: res.playerId, name }));
      setPlayerId(res.playerId);
      setNeedsName(false);
    });
  }

  function handleBuzz() {
    if (!playerId || !code) return;
    const socket = getSocket();
    socket.emit("buzz", { code, playerId });
  }

  function leaveGame() {
    if (!confirm("Leave the game?")) return;
    if (!playerId || !code) return;
    const socket = getSocket();
    socket.emit("leave_game", { code, playerId }, () => {
      sessionStorage.removeItem(`trivia_player_${code}`);
      router.push("/");
    });
  }

  if (needsName) {
    return (
      <div className="center-page">
        <div className="brand" style={{ fontSize: "1.6rem" }}>Join Game</div>
        <div className="card">
          <div className="field">
            <label>Your Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          <button className="btn-primary" style={{ width: "100%" }} onClick={handleJoin}>
            Join
          </button>
          {error && <div className="error-msg">{error}</div>}
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="center-page">
        <div className="subtitle">Connecting...</div>
      </div>
    );
  }

  const picker = view.players.find((p) => p.id === view.currentPickerId);
  const isPicker = picker?.id === view.you?.id;

  let statusText = "";
  if (view.phase === "LOBBY") statusText = "Waiting for host to start the game...";
  else if (view.phase === "BOARD") statusText = isPicker ? "Your pick! Tell the host a category & points." : `${picker?.name || "Someone"} is picking...`;
  else if (view.phase === "REVEALING") statusText = view.buzzerState === "ready" ? "Buzz in when you know it!" : "Question revealing...";
  else if (view.phase === "BUZZED") statusText = view.buzzerState === "locked_you" ? "Tell the host your answer!" : "Someone else is answering...";
  else if (view.phase === "REVEAL_ANSWER") statusText = "Answer revealed on host screen";

  const buzzerClass =
    view.buzzerState === "ready"
      ? "green"
      : view.buzzerState === "locked_you"
      ? "yellow-you"
      : view.buzzerState === "locked_other"
      ? "yellow-other"
      : "red";

  return (
    <div className="page">
      <div className="player-top-row">
        <div className="brand" style={{ fontSize: "1.4rem" }}>🏆 {view.you?.name || "Player"}</div>
        <button className="btn-secondary btn-small" onClick={leaveGame}>
          Leave
        </button>
      </div>

      <div className="scoreboard">
        {view.players.map((p) => (
          <div
            key={p.id}
            className={`score-chip ${p.id === view.currentPickerId ? "picker" : ""} ${!p.connected ? "disconnected" : ""} ${
              p.id === view.you?.id ? "" : ""
            }`}
          >
            <span className="dot" />
            {p.name}
            <span className="pts">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="player-status">{statusText}</div>

      <div className="buzzer-wrap">
        <button
          className={`buzzer ${buzzerClass}`}
          onClick={handleBuzz}
          disabled={view.buzzerState !== "ready"}
        >
          {view.buzzerState === "ready" ? "BUZZ!" : view.buzzerState === "locked_you" ? "ANSWERING" : "WAIT"}
        </button>
      </div>

      <div className="footer-note">Lobby code: {view.code}</div>
    </div>
  );
}