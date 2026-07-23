import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../../lib/socket";
import { HostView } from "../../lib/types";

export default function HostPage() {
  const router = useRouter();
  const { code, token } = router.query as { code?: string; token?: string };
  const [view, setView] = useState<HostView | null>(null);
  const [error, setError] = useState("");
  const [answerNote, setAnswerNote] = useState("");

  useEffect(() => {
    if (!router.isReady || !code || !token) return;
    const socket = getSocket();

    function onState(v: HostView) {
      setView(v);
    }
    socket.on("state", onState);
    socket.emit("host_join", { code, token }, (res: any) => {
      if (!res?.ok) setError(res?.error || "Could not connect as host");
    });

    return () => {
      socket.off("state", onState);
    };
  }, [router.isReady, code, token]);

  function startGame() {
    const socket = getSocket();
    socket.emit("start_game", { code, token }, (res: any) => {
      if (!res?.ok) setError(res?.error || "Could not start game");
    });
  }

  function selectCell(category: string, points: number) {
    const socket = getSocket();
    socket.emit("select_cell", { code, token, category, points }, (res: any) => {
      if (!res?.ok) setError(res?.error || "Could not select cell");
    });
  }

  function submitAnswer(correct: boolean) {
    const socket = getSocket();
    socket.emit("submit_answer", { code, token, correct }, () => setAnswerNote(""));
  }

  function forceReveal() {
    const socket = getSocket();
    socket.emit("force_reveal", { code, token });
  }

  function continueToBoard() {
    const socket = getSocket();
    socket.emit("continue_to_board", { code, token });
  }

  if (!view) {
    return (
      <div className="center-page">
        <div className="subtitle">{error || "Connecting..."}</div>
      </div>
    );
  }

  const picker = view.players.find((p) => p.id === view.currentPickerId);
  const buzzedPlayer = view.players.find((p) => p.id === view.currentQuestion?.buzzedPlayerId);

  return (
    <div className="page">
      <div className="brand" style={{ fontSize: "1.5rem" }}>🏆 TRIVIA SHOWDOWN — HOST</div>
      <div className="board-code">
        Players join at <b>{typeof window !== "undefined" ? window.location.origin : ""}</b> with code{" "}
        <b>{view.code}</b>
      </div>

      <div className="scoreboard">
        {view.players.map((p) => (
          <div
            key={p.id}
            className={`score-chip ${p.id === view.currentPickerId ? "picker" : ""} ${!p.connected ? "disconnected" : ""}`}
          >
            <span className="dot" />
            {p.name}
            <span className="pts">{p.score}</span>
          </div>
        ))}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {view.phase === "LOBBY" && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Waiting for players to join... ({view.players.length} joined)
          </p>
          <button className="btn-primary" style={{ width: "100%" }} onClick={startGame}>
            Start Game
          </button>
        </div>
      )}

      {view.phase === "BOARD" && (
        <>
          {picker && <div className="turn-banner">🎯 {picker.name}, pick a category and point value!</div>}
          <div className="board-grid">
            {view.categories.map((cat) => (
              <div className="board-cat-header" key={cat}>
                {cat}
              </div>
            ))}
            {[100, 200, 300, 400, 500].map((pts) =>
              view.categories.map((cat) => {
                const cell = view.cells.find((c) => c.category === cat && c.points === pts)!;
                return (
                  <div
                    key={`${cat}-${pts}`}
                    className={`board-cell ${cell.used ? "used" : "clickable"}`}
                    onClick={() => !cell.used && selectCell(cat, pts)}
                  >
                    {cell.used ? "" : pts}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {(view.phase === "REVEALING" || view.phase === "BUZZED" || view.phase === "REVEAL_ANSWER") &&
        view.currentQuestion && (
          <div className="question-card">
            <div className="question-topic">
              {view.currentQuestion.category} — {view.currentQuestion.points} pts
            </div>
            <div className="question-text">
              {view.currentQuestion.revealedText}
              {view.phase === "REVEALING" && !view.currentQuestion.fullyRevealed && <span className="cursor-blink" />}
            </div>

            {view.phase === "REVEALING" && (
              <div className="answer-row">
                <button className="btn-secondary" onClick={forceReveal}>
                  No buzz — reveal answer
                </button>
              </div>
            )}

            {view.phase === "BUZZED" && buzzedPlayer && (
              <>
                <div className="buzzed-banner">🔔 {buzzedPlayer.name} buzzed in!</div>
                <div className="field" style={{ marginTop: 16, textAlign: "left" }}>
                  <label>What did they say? (optional note)</label>
                  <input
                    type="text"
                    value={answerNote}
                    onChange={(e) => setAnswerNote(e.target.value)}
                    placeholder="Type their guess here..."
                  />
                </div>
                <div className="answer-row">
                  <button className="btn-success" onClick={() => submitAnswer(true)}>
                    ✅ Correct
                  </button>
                  <button className="btn-danger" onClick={() => submitAnswer(false)}>
                    ❌ Incorrect
                  </button>
                </div>
              </>
            )}

            {view.phase === "REVEAL_ANSWER" && (
              <>
                <div className="answer-reveal">Answer: {view.currentQuestion.answer}</div>
                <div className="answer-row">
                  <button className="btn-primary" onClick={continueToBoard}>
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        )}
    </div>
  );
}
