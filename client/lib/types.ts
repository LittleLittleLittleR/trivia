export type Phase = "LOBBY" | "BOARD" | "COUNTDOWN" | "REVEALING" | "BUZZED" | "REVEAL_ANSWER";

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface Cell {
  category: string;
  points: number;
  used: boolean;
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
    answer: string | null;
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