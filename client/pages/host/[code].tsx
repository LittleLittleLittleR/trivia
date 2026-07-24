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
    function onEnded() {
      router.push("/");
    }
    socket.on("state", onState);
    socket.on("game_ended", onEnded);
    socket.emit("host_join", { code, token }, (res: any) => {
      if (!res?.ok) setError(res?.error || "Could not connect as host");
    });

    return () => {
      socket.off("state", onState);
      socket.off("game_ended", onEnded);
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
    if (answerNote.trim().length === 0) return;
    const socket = getSocket();
    socket.emit("submit_answer", { code, token, correct }, () => setAnswerNote(""));
  }

  function normalize(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ");
  }

  function forceReveal() {
    const socket = getSocket();
    socket.emit("force_reveal", { code, token });
  }

  function continueToBoard() {
    const socket = getSocket();
    socket.emit("continue_to_board", { code, token });
  }

  function endGame() {
    if (!confirm("End the game for everyone? This can't be undone.")) return;
    const socket = getSocket();
    socket.emit("end_game", { code, token }, (res: any) => {
      if (res?.ok) router.push("/");
    });
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
    <div className={`host-page ${view.phase === "BOARD" ? "board-mode" : ""}`}>
      <div className="host-header">
        <div className="host-top-row">
          <div className="brand" style={{ fontSize: "1.3rem", marginBottom: 2 }}>🏆 TRIVIA SHOWDOWN — HOST</div>
          <button className="btn-danger btn-small" onClick={endGame}>
            End Game
          </button>
        </div>
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
      </div>

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
        <div className="board-wrap">
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
        </div>
      )}

      {view.phase === "COUNTDOWN" && view.currentQuestion && (
        <div className="question-card">
          <div className="question-topic">
            {view.currentQuestion.category} — {view.currentQuestion.points} pts
          </div>
          <div className="countdown-label">Get ready...</div>
          <div className="countdown-display">
            <div key={view.countdownValue} className="countdown-number">
              {view.countdownValue}
            </div>
          </div>
        </div>
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
                <div className="answer-key">
                  Answer key: <b>{view.currentQuestion.answer}</b>
                </div>
                <div className="field" style={{ marginTop: 12, textAlign: "left" }}>
                  <label>What did they say? (required — type it to compare against the answer key)</label>
                  <input
                    type="text"
                    value={answerNote}
                    onChange={(e) => setAnswerNote(e.target.value)}
                    placeholder="Type their guess here..."
                    autoFocus
                  />
                  {answerNote.trim().length > 0 && (
                    <div className={`match-hint ${normalize(answerNote) === normalize(view.currentQuestion.answer) ? "match" : "no-match"}`}>
                      {normalize(answerNote) === normalize(view.currentQuestion.answer)
                        ? "✓ Matches the answer key"
                        : "Doesn't exactly match — use your judgement"}
                    </div>
                  )}
                </div>
                <div className="answer-row">
                  <button className="btn-success" onClick={() => submitAnswer(true)} disabled={answerNote.trim().length === 0}>
                    ✅ Correct
                  </button>
                  <button className="btn-danger" onClick={() => submitAnswer(false)} disabled={answerNote.trim().length === 0}>
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