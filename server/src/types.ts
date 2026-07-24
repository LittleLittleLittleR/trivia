export type Phase = "LOBBY" | "BOARD" | "COUNTDOWN" | "REVEALING" | "BUZZED" | "REVEAL_ANSWER";

export interface Player {
  id: string;
  socketId: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface Cell {
  category: string;
  points: number;
  used: boolean;
}

export interface ActiveQuestion {
  category: string;
  points: number;
  text: string;
  answer: string;
  revealedChars: number;
  attemptedPlayerIds: string[]; // players who buzzed + were wrong on this question
  buzzedPlayerId: string | null; // player currently locked in to answer
  resultType: "correct" | "failed" | null; // set once a question is resolved, until Continue is clicked
  winnerId: string | null;
}

export interface Lobby {
  code: string;
  hostToken: string;
  hostSocketId: string | null;
  players: Player[];
  phase: Phase;
  cells: Cell[]; // flat list of 25 cells (5 categories x 5 point values)
  currentPickerId: string | null;
  currentQuestion: ActiveQuestion | null;
  revealTimer: ReturnType<typeof setInterval> | null;
  countdownValue: number | null;
  countdownTimer: ReturnType<typeof setInterval> | null;
  createdAt: number;
}

// ---- What gets sent down the wire ----

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface HostView {
  role: "host";
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  categories: string[];
  cells: Cell[];
  currentPickerId: string | null;
  countdownValue: number | null;
  currentQuestion: {
    category: string;
    points: number;
    text: string;
    answer: string | null; // only populated once resultType is set - hidden while a guess is being judged
    revealedText: string;
    fullyRevealed: boolean;
    buzzedPlayerId: string | null;
    attemptedPlayerIds: string[];
    resultType: "correct" | "failed" | null;
    winnerId: string | null;
  } | null;
}

export interface PlayerView {
  role: "player";
  code: string;
  phase: Phase;
  you: PublicPlayer | null;
  players: PublicPlayer[];
  categories: string[];
  currentPickerId: string | null;
  currentPoints: number | null;
  currentCategory: string | null;
  countdownValue: number | null;
  buzzerState: "disabled" | "ready" | "locked_you" | "locked_other";
}