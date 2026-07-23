# Trivia Showdown

A live, buzzer-round trivia game. One device is the **host** (shows the board & question,
judges answers); other devices join as **players** (see their score / a buzzer button).

Two parts, deployed separately:

- **/server** — Node + Express + Socket.io (plain TypeScript). Holds all game state in memory,
  drives the question "typing" animation, and enforces the buzz-in rules. Deploy this to
  **Render**, **Railway**, or **Fly.io** (Vercel serverless can't hold a persistent WebSocket
  connection, so it can't host this part).
- **/client** — Next.js + TypeScript + socket.io-client. Deploy this to **Vercel** as planned.

## 1. Add your questions

Open `server/src/questions.ts` and replace the 5 sample categories with your real ones.
Each category needs exactly 5 questions (100/200/300/400/500). That's the only file you need
to edit to set up a game.

## 2. Run locally

```bash
# terminal 1
cd server
npm install
npm run dev        # starts on http://localhost:4000

# terminal 2
cd client
cp .env.local.example .env.local   # already points at localhost:4000
npm install
npm run dev         # starts on http://localhost:3000
```

Open `http://localhost:3000` in one tab to host, and in other tabs/devices (on the same
network, using your computer's local IP instead of localhost) to join as players.

## 3. Deploy

**Server (Render, free tier is fine):**
1. Push this repo to GitHub.
2. On Render: New → Web Service → point at the repo, set root directory to `server`.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Once deployed you'll get a URL like `https://your-app.onrender.com`.

**Client (Vercel):**
1. On Vercel: New Project → import the repo, set root directory to `client`.
2. Add an Environment Variable: `NEXT_PUBLIC_SERVER_URL` = your Render server URL from above.
3. Deploy. Share the Vercel URL with your players; host creates a lobby, players join with
   the code.

## How the game flow works

1. Host opens the site → **Host a New Game** → gets a lobby code + link.
2. Players open the site (or a shared link) → enter the code + their name.
3. Host clicks **Start Game** once everyone's in → 5x5 board appears (5 categories x
   100/200/300/400/500).
4. The player whose turn it is tells the host (out loud) which category & points to open.
   Host clicks that cell.
5. The question types itself out on the host's screen. All players' buzzers turn **green**.
6. First player to buzz freezes the reveal; their buzzer turns **yellow**, everyone else's
   turns **red** ("someone else is answering").
7. Player says their answer out loud. Host clicks **Correct** (awards points, back to board,
   that player picks next) or **Incorrect** (that player is locked out of this question,
   reveal resumes, remaining players' buzzers go green again).
8. If everyone's attempted and failed, the full question + answer show automatically and the
   host clicks **Continue** to go back to the board (turn rotates to the next player).

## Notes / limitations (kept intentionally simple)

- No login/auth — the host link contains a secret token in the URL; keep that link private
  and only share the plain `/player/CODE` link (or just the code) with players.
- Game state lives in server memory — if the server restarts, active lobbies are lost.
  Fine for a one-off game night; not built for long-term persistence.
- If the host's tab refreshes, reopening the same host link (with `?token=...`) reclaims host
  control. Players reconnecting on the same device also automatically rejoin using
  `sessionStorage`.
