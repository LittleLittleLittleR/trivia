import express from "express";
import http from "http";
import cors from "cors";
import { Server, Socket } from "socket.io";
import { CATEGORIES, POINT_VALUES } from "./questions";
import { Lobby, Player, HostView, PlayerView, Cell } from "./types";

const PORT = process.env.PORT || 4000;
const REVEAL_MS_PER_CHAR = 45; // typing speed
const COUNTDOWN_SECONDS = 3; // how many numbers flash before reveal starts

const app = express();
app.use(cors());
app.get("/", (_req, res) => res.send("Trivia server is running."));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const lobbies = new Map<string, Lobby>();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (lobbies.has(code));
  return code;
}

function genToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (const cat of CATEGORIES) {
    for (const pts of POINT_VALUES) {
      cells.push({ category: cat.name, points: pts, used: false });
    }
  }
  return cells;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

function isCorrectGuess(guess: string, answer: string | string[]): boolean {
  const normalizedGuess = normalize(guess || "");
  const accepted = Array.isArray(answer) ? answer : [answer];
  return accepted.some((a) => normalize(a) === normalizedGuess);
}

function findQuestionText(category: string, points: number) {
  const cat = CATEGORIES.find((c) => c.name === category);
  if (!cat) return null;
  // @ts-ignore - points is one of the known keys
  return cat.questions[points] as { text: string; answer: string } | undefined;
}

function publicPlayers(lobby: Lobby) {
  return lobby.players.map((p) => ({ id: p.id, name: p.name, score: p.score, connected: p.connected }));
}

function clearRevealTimer(lobby: Lobby) {
  if (lobby.revealTimer) {
    clearInterval(lobby.revealTimer);
    lobby.revealTimer = null;
  }
}

function clearCountdownTimer(lobby: Lobby) {
  if (lobby.countdownTimer) {
    clearInterval(lobby.countdownTimer);
    lobby.countdownTimer = null;
  }
}

function hostView(lobby: Lobby): HostView {
  const cq = lobby.currentQuestion;
  return {
    role: "host",
    code: lobby.code,
    phase: lobby.phase,
    players: publicPlayers(lobby),
    categories: CATEGORIES.map((c) => c.name),
    cells: lobby.cells,
    currentPickerId: lobby.currentPickerId,
    countdownValue: lobby.countdownValue,
    currentQuestion: cq
      ? {
          category: cq.category,
          points: cq.points,
          text: cq.text,
          answer: cq.resultType ? cq.answer : null,
          revealedText: cq.text.slice(0, cq.revealedChars),
          fullyRevealed: cq.revealedChars >= cq.text.length,
          buzzedPlayerId: cq.buzzedPlayerId,
          attemptedPlayerIds: cq.attemptedPlayerIds,
          resultType: cq.resultType,
          winnerId: cq.winnerId,
        }
      : null,
  };
}

function playerView(lobby: Lobby, playerId: string): PlayerView {
  const you = lobby.players.find((p) => p.id === playerId) || null;
  const cq = lobby.currentQuestion;
  let buzzerState: PlayerView["buzzerState"] = "disabled";
  if (cq && lobby.phase === "REVEALING") {
    buzzerState = you && cq.attemptedPlayerIds.includes(you.id) ? "disabled" : "ready";
  } else if (cq && lobby.phase === "BUZZED") {
    buzzerState = cq.buzzedPlayerId === playerId ? "locked_you" : "locked_other";
  }
  return {
    role: "player",
    code: lobby.code,
    phase: lobby.phase,
    you: you ? { id: you.id, name: you.name, score: you.score, connected: you.connected } : null,
    players: publicPlayers(lobby),
    categories: CATEGORIES.map((c) => c.name),
    currentPickerId: lobby.currentPickerId,
    currentPoints: cq ? cq.points : null,
    currentCategory: cq ? cq.category : null,
    countdownValue: lobby.countdownValue,
    buzzerState,
  };
}

function broadcast(lobby: Lobby) {
  if (lobby.hostSocketId) {
    io.to(lobby.hostSocketId).emit("state", hostView(lobby));
  }
  for (const p of lobby.players) {
    if (p.connected) io.to(p.socketId).emit("state", playerView(lobby, p.id));
  }
}

function startCountdown(lobby: Lobby) {
  clearRevealTimer(lobby);
  clearCountdownTimer(lobby);
  lobby.phase = "COUNTDOWN";
  lobby.countdownValue = COUNTDOWN_SECONDS;
  broadcast(lobby);
  lobby.countdownTimer = setInterval(() => {
    if (lobby.countdownValue === null) return;
    lobby.countdownValue -= 1;
    if (lobby.countdownValue <= 0) {
      clearCountdownTimer(lobby);
      lobby.countdownValue = null;
      startReveal(lobby);
    } else {
      broadcast(lobby);
    }
  }, 1000);
}

function startReveal(lobby: Lobby) {
  clearRevealTimer(lobby);
  lobby.phase = "REVEALING";
  lobby.revealTimer = setInterval(() => {
    const cq = lobby.currentQuestion;
    if (!cq) return;
    if (cq.revealedChars < cq.text.length) {
      cq.revealedChars += 1;
      broadcast(lobby);
    } else {
      clearRevealTimer(lobby);
    }
  }, REVEAL_MS_PER_CHAR);
}

function rotatePicker(lobby: Lobby, toId?: string) {
  if (toId) {
    lobby.currentPickerId = toId;
    return;
  }
  if (lobby.players.length === 0) return;
  const idx = lobby.players.findIndex((p) => p.id === lobby.currentPickerId);
  const next = lobby.players[(idx + 1) % lobby.players.length];
  lobby.currentPickerId = next.id;
}

function removePlayer(lobby: Lobby, playerId: string) {
  const idx = lobby.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;
  const wasPicker = lobby.currentPickerId === playerId;
  const cq = lobby.currentQuestion;
  const wasBuzzed = cq?.buzzedPlayerId === playerId;

  lobby.players.splice(idx, 1);

  if (lobby.players.length === 0) {
    clearRevealTimer(lobby);
    clearCountdownTimer(lobby);
    lobby.currentPickerId = null;
    lobby.currentQuestion = null;
    if (lobby.phase !== "LOBBY") lobby.phase = "BOARD";
    return;
  }

  if (cq) {
    cq.attemptedPlayerIds = cq.attemptedPlayerIds.filter((id) => id !== playerId);
    if (wasBuzzed) {
      cq.buzzedPlayerId = null;
      if (cq.attemptedPlayerIds.length >= lobby.players.length) {
        cq.revealedChars = cq.text.length;
        cq.resultType = "failed";
        lobby.phase = "REVEAL_ANSWER";
      } else {
        startReveal(lobby);
      }
    }
  }

  if (wasPicker) {
    const nextIdx = idx % lobby.players.length;
    lobby.currentPickerId = lobby.players[nextIdx].id;
  }
}

function checkAuth(lobby: Lobby | undefined, token: string): lobby is Lobby {
  return !!lobby && lobby.hostToken === token;
}

io.on("connection", (socket: Socket) => {
  socket.on("create_lobby", (_data, cb) => {
    const code = genCode();
    const hostToken = genToken();
    const lobby: Lobby = {
      code,
      hostToken,
      hostSocketId: socket.id,
      players: [],
      phase: "LOBBY",
      cells: buildCells(),
      currentPickerId: null,
      currentQuestion: null,
      revealTimer: null,
      countdownValue: null,
      countdownTimer: null,
      createdAt: Date.now(),
    };
    lobbies.set(code, lobby);
    socket.join(code);
    cb?.({ ok: true, code, hostToken });
    broadcast(lobby);
  });

  socket.on("host_join", ({ code, token }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Invalid host token" });
    lobby.hostSocketId = socket.id;
    socket.join(code);
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("get_lobby_info", ({ code }, cb) => {
    const lobby = lobbies.get(code);
    if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
    cb?.({ ok: true, players: publicPlayers(lobby) });
  });

  socket.on("join_lobby", ({ code, name }, cb) => {
    const lobby = lobbies.get(code);
    if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
    if (lobby.phase !== "LOBBY") return cb?.({ ok: false, error: "Game already started" });
    const trimmedName = name?.trim() || "Player";
    if (lobby.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return cb?.({ ok: false, error: "Name already taken in this lobby" });
    }
    const id = Math.random().toString(36).slice(2, 10);
    const player: Player = { id, socketId: socket.id, name: trimmedName, score: 0, connected: true };
    lobby.players.push(player);
    socket.join(code);
    cb?.({ ok: true, playerId: id });
    broadcast(lobby);
  });

  socket.on("player_rejoin", ({ code, playerId }, cb) => {
    const lobby = lobbies.get(code);
    const player = lobby?.players.find((p) => p.id === playerId);
    if (!lobby || !player) return cb?.({ ok: false, error: "Could not rejoin" });
    player.socketId = socket.id;
    player.connected = true;
    socket.join(code);
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("start_game", ({ code, token }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    if (lobby.players.length === 0) return cb?.({ ok: false, error: "Need at least 1 player" });
    lobby.phase = "BOARD";
    lobby.currentPickerId = lobby.players[Math.floor(Math.random() * lobby.players.length)].id;
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("select_cell", ({ code, token, category, points }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    if (lobby.phase !== "BOARD") return cb?.({ ok: false, error: "Not in board phase" });
    const cell = lobby.cells.find((c) => c.category === category && c.points === points);
    if (!cell || cell.used) return cb?.({ ok: false, error: "Cell unavailable" });
    const qa = findQuestionText(category, points);
    if (!qa) return cb?.({ ok: false, error: "Question not found - check questions.ts" });
    cell.used = true;
    lobby.currentQuestion = {
      category,
      points,
      text: qa.text,
      answer: qa.answer,
      revealedChars: 0,
      attemptedPlayerIds: [],
      buzzedPlayerId: null,
      resultType: null,
      winnerId: null,
    };
    cb?.({ ok: true });
    startCountdown(lobby);
    broadcast(lobby);
  });

  socket.on("buzz", ({ code, playerId }, cb) => {
    const lobby = lobbies.get(code);
    if (!lobby || !lobby.currentQuestion) return cb?.({ ok: false });
    if (lobby.phase !== "REVEALING") return cb?.({ ok: false, error: "Buzzer not active" });
    if (lobby.currentQuestion.attemptedPlayerIds.includes(playerId)) return cb?.({ ok: false, error: "Already attempted" });
    clearRevealTimer(lobby);
    lobby.phase = "BUZZED";
    lobby.currentQuestion.buzzedPlayerId = playerId;
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("submit_guess", ({ code, token, guess }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    const cq = lobby.currentQuestion;
    if (!cq || lobby.phase !== "BUZZED" || !cq.buzzedPlayerId) return cb?.({ ok: false, error: "No active buzz" });
    const buzzedId = cq.buzzedPlayerId;
    const correct = isCorrectGuess(guess, cq.answer);
    if (correct) {
      const player = lobby.players.find((p) => p.id === buzzedId);
      if (player) player.score += cq.points;
      cq.buzzedPlayerId = null;
      cq.resultType = "correct";
      cq.winnerId = buzzedId;
      cq.revealedChars = cq.text.length;
      lobby.phase = "REVEAL_ANSWER";
    } else {
      cq.attemptedPlayerIds.push(buzzedId);
      cq.buzzedPlayerId = null;
      if (cq.attemptedPlayerIds.length >= lobby.players.length) {
        cq.resultType = "failed";
        cq.revealedChars = cq.text.length;
        lobby.phase = "REVEAL_ANSWER";
      } else {
        startReveal(lobby);
      }
    }
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("force_reveal", ({ code, token }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    const cq = lobby.currentQuestion;
    if (!cq) return cb?.({ ok: false });
    clearRevealTimer(lobby);
    cq.revealedChars = cq.text.length;
    cq.resultType = "failed";
    lobby.phase = "REVEAL_ANSWER";
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("continue_to_board", ({ code, token }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    const cq = lobby.currentQuestion;
    lobby.phase = "BOARD";
    lobby.currentQuestion = null;
    if (cq?.resultType === "correct" && cq.winnerId) {
      rotatePicker(lobby, cq.winnerId);
    } else {
      rotatePicker(lobby);
    }
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("leave_game", ({ code, playerId }, cb) => {
    const lobby = lobbies.get(code);
    if (!lobby) return cb?.({ ok: false, error: "Lobby not found" });
    removePlayer(lobby, playerId);
    socket.leave(code);
    cb?.({ ok: true });
    broadcast(lobby);
  });

  socket.on("end_game", ({ code, token }, cb) => {
    const lobby = lobbies.get(code);
    if (!checkAuth(lobby, token)) return cb?.({ ok: false, error: "Not authorized" });
    clearRevealTimer(lobby);
    clearCountdownTimer(lobby);
    io.to(code).emit("game_ended");
    lobbies.delete(code);
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const lobby of lobbies.values()) {
      const player = lobby.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        broadcast(lobby);
      }
      if (lobby.hostSocketId === socket.id) {
        // Host disconnected - keep lobby alive in case of refresh/reconnect via host_join.
        lobby.hostSocketId = null;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Trivia server listening on port ${PORT}`);
});