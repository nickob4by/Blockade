# Blockade (Quoridor) - 2D Grid Racing & Wall Placement Game

A strategic 2-player turn-based board game built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase Realtime**, optimized for deployment on **Vercel**.

![Blockade Preview](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/og.jpg)

---

## 🎮 Game Rules

Inspired by the classic game **Quoridor / Blockade**:

1. **The Objective**:
   - The board is a **9x9 grid**.
   - **Player 1** starts at the bottom center `(row 8, col 4)` and must reach **any cell on the top row (row 0)**.
   - **Player 2** starts at the top center `(row 0, col 4)` and must reach **any cell on the bottom row (row 8)**.
   - First player to reach the opposite side wins!

2. **On Each Turn, Choose 1 Action**:
   - **Move Your Pawn**: Move 1 square orthogonally (up, down, left, right) into an open adjacent square.
   - **Jumping**:
     - If you are face-to-face with your opponent and there is no wall between you, you can **jump straight over them** to the square behind them!
     - If a wall or board edge blocks the straight jump behind them, you can **jump diagonally** to either side of the opponent.
   - **Place a Wall**: Place a 2-square wall horizontally or vertically along the grooves between cells to impede your opponent's progress.

3. **Wall Constraints & The Golden Rule**:
   - Each player has **10 walls** in total.
   - Walls cannot overlap or intersect through the same center point.
   - **Strict Non-Trapping Rule (Fairness)**: A wall placement is strictly illegal if it completely blocks either player from having at least one valid path to their finish line. Our built-in Breadth-First Search (BFS) pathfinder validates this dynamically before allowing any placement.

4. **Keyboard Shortcuts**:
   - <kbd>Space</kbd> or <kbd>R</kbd>: Toggle wall orientation between **Horizontal** and **Vertical**.

---

## 🚀 Game Modes

- **Local 2-Player (Pass & Play)**: Play against a friend on the same screen (desktop or mobile touch).
- **Single Player vs AI**: Play against **BlockBot AI**, an intelligent bot that balances shortest-path movement with tactical wall placements when you're ahead!
- **Online Multiplayer (Supabase)**: Create a room, share the 6-character room code or URL link, and play in real-time across devices!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom neon glassmorphism & responsive CSS grid
- **Backend / Realtime**: Supabase (Realtime Broadcast channels)
- **Audio**: Web Audio API Synthesizer (zero external audio file dependencies)
- **Deployment**: Vercel

---

## ⚡ Getting Started Locally

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Run automated test suite**:
   ```bash
   npm test
   ```

---

## 🌐 Supabase Multiplayer Setup (Optional)

Local 2P and AI modes work **100% out of the box** without any external configuration. To enable **Online Multiplayer**:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open your project settings at **Project Settings → API** and copy:
   - Project URL
   - Anon public API key
3. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. *(Optional)* If you want persistent match records, run the SQL script in `supabase/schema.sql` in your Supabase SQL Editor.

---

## 🚀 Deploying to Vercel

1. Push your code to GitHub, GitLab, or Bitbucket.
2. Import your repository into [Vercel](https://vercel.com).
3. In your Vercel Project Settings under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**!
