import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { GameScreen } from "@/components/game/GameScreen";
import { useAuth } from "@/lib/auth";
import {
  type GameMode, createSession,
  getOrCreatePlayerId, getSavedNickname, saveNickname,
} from "@/lib/multiplayer";
import { SHIP_TYPES, DEFAULT_FLEET, fleetTotal, type FleetConfig, type ShipKind } from "@/lib/game/types";
import { sfx } from "@/lib/sound";

export const Route = createFileRoute("/play")({
  component: PlayPage,
  head: () => ({ meta: [{ title: "Battle · Battleship" }] }),
});

type Screen = "lobby" | "bot" | "create-mp";

function PlayPage() {
  const { loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("lobby");
  if (loading) return <div className="p-10 text-muted-foreground text-sm">Booting comms…</div>;
  if (screen === "bot") return <GameScreen onBack={() => setScreen("lobby")} />;
  if (screen === "create-mp") return <CreateMultiplayer onBack={() => setScreen("lobby")} />;
  return <Lobby onSelectBot={() => setScreen("bot")} onSelectMultiplayer={() => setScreen("create-mp")} />;
}

function Lobby({ onSelectBot, onSelectMultiplayer }: { onSelectBot: () => void; onSelectMultiplayer: () => void }) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="glass max-w-3xl w-full p-12 space-y-10">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-display text-4xl uppercase tracking-widest">Play</h1>
            <p className="text-sm text-muted-foreground mt-2">Pick a mode. Get in. No noise.</p>
          </div>
          <a href="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground transition">
            Leaderboard →
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-8">
          <motion.button
            onClick={() => { sfx.click(); onSelectBot(); }}
            className="glass p-8 text-left space-y-4 hover:border-border/80 transition group rounded-xl border border-border relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHoveredCard('bot')}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-[var(--cyan)]/5 to-transparent opacity-0"
              animate={{ opacity: hoveredCard === 'bot' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            <div className="relative z-10">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Solo</div>
              <div>
                <motion.div 
                  className="font-display text-xl uppercase tracking-widest text-foreground"
                  animate={{
                    textShadow: hoveredCard === 'bot' ? '0 0 20px oklch(0.96 0 0 / 0.6)' : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  Vs Bot
                </motion.div>
                <div className="text-xs text-muted-foreground mt-1">Adaptive AI with three difficulty levels</div>
              </div>
              <div className="text-xs text-muted-foreground">Unlimited · Play offline</div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => { sfx.click(); onSelectMultiplayer(); }}
            className="glass p-8 text-left space-y-4 hover:border-border/80 transition group rounded-xl border border-border relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHoveredCard('mp')}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-[var(--enemy)]/5 to-transparent opacity-0"
              animate={{ opacity: hoveredCard === 'mp' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            <div className="relative z-10">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Online</div>
              <div>
                <motion.div 
                  className="font-display text-xl uppercase tracking-widest text-foreground"
                  animate={{
                    textShadow: hoveredCard === 'mp' ? '0 0 20px oklch(0.62 0.25 25 / 0.6)' : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  Multiplayer
                </motion.div>
                <div className="text-xs text-muted-foreground mt-1">Share a link. Play 2–4 players in realtime</div>
              </div>
              <div className="text-xs text-muted-foreground">Timed or unlimited · Custom fleets</div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function CreateMultiplayer({ onBack }: { onBack: () => void }) {
  const nav = useNavigate();
  const [nickname, setNickname] = useState(getSavedNickname());
  const [gameMode, setGameMode] = useState<GameMode>("10min");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [gridSize, setGridSize] = useState(10);
  const [fleet, setFleet] = useState<FleetConfig>({ ...DEFAULT_FLEET });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const total = fleetTotal(fleet);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    sfx.click();
    if (total === 0) { setError("Select at least 1 ship."); return; }
    setCreating(true);
    setError(null);
    const nick = nickname.trim() || "Commander";
    saveNickname(nick);
    getOrCreatePlayerId();

    if (playerCount === 2) {
      const session = await createSession(gameMode, nick, fleet, gridSize);
      setCreating(false);
      if (!session) { setError("Failed to create session. Try again."); return; }
      nav({ to: "/mp/$sessionId", params: { sessionId: session.id } });
    } else {
      const { createRoom } = await import("@/lib/mpRoom");
      const room = await createRoom({ mode: gameMode, maxPlayers: playerCount, fleet, gridSize, nickname: nick });
      setCreating(false);
      if (!room) { setError("Failed to create room. Try again."); return; }
      nav({ to: "/room/$roomId", params: { roomId: room.id } });
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="glass max-w-lg w-full p-8 space-y-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center gap-3">
          <button onClick={() => { sfx.click(); onBack(); }} className="text-muted-foreground hover:text-foreground text-sm">← Back</button>
          <h2 className="font-display text-xl uppercase tracking-widest neon-cyan">New Battle</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">Your Callsign</label>
            <input
              type="text"
              className="input-cyber mt-1"
              placeholder="Commander"
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-2 block">Players</label>
            <div className="flex gap-3">
              {([2, 3, 4] as const).map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  onClick={() => { sfx.click(); setPlayerCount(n); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setHoveredButton(`player-${n}`)}
                  onHoverEnd={() => setHoveredButton(null)}
                  className={`flex-1 py-3 rounded-lg text-sm font-display uppercase tracking-widest border transition relative overflow-hidden ${
                    playerCount === n
                      ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{
                      scale: hoveredButton === `player-${n}` ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {n}P
                  </motion.span>
                </motion.button>
              ))}
            </div>
            {playerCount > 2 && (
              <p className="text-xs text-muted-foreground mt-1">
                Players share a room link. Turn-based — select your target each round.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-2 block">Timer Mode</label>
            <div className="flex gap-3">
              {(["4min", "10min", "infinite"] as GameMode[]).map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  onClick={() => { sfx.click(); setGameMode(m); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setHoveredButton(`mode-${m}`)}
                  onHoverEnd={() => setHoveredButton(null)}
                  className={`flex-1 py-3 rounded-lg text-xs font-display uppercase tracking-widest border transition relative overflow-hidden ${
                    gameMode === m
                      ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{
                      scale: hoveredButton === `mode-${m}` ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {m === "infinite" ? "∞ No Limit" : m === "4min" ? "4 Min" : "10 Min"}
                  </motion.span>
                </motion.button>
              ))}
            </div>
            {gameMode !== "infinite" && (
              <p className="text-xs text-muted-foreground mt-1">
                Each player's clock only ticks on their own turn. Most ships sunk wins on timeout.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => { sfx.click(); setShowAdvanced((v) => !v); }}
            className="text-xs text-muted-foreground hover:text-foreground transition w-full text-left"
          >
            {showAdvanced ? "▼" : "▶"} Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 border border-border rounded-md p-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">Grid Size</label>
                  <span className="text-xs font-display neon-cyan">{gridSize}×{gridSize}</span>
                </div>
                <input
                  type="range" min={8} max={16} step={1} value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full accent-[var(--cyan)]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>8×8</span><span>12×12</span><span>16×16</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">Fleet Configuration</label>
                  <span className="text-xs text-muted-foreground">{total} ships</span>
                </div>
                <div className="space-y-2">
                  {SHIP_TYPES.map((def) => (
                    <div key={def.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 font-mono">{def.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: def.size }).map((_, i) => (
                          <div key={i} className="w-3 h-3 rounded-sm bg-[var(--cyan)]/40" />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setFleet((f) => ({ ...f, [def.id]: Math.max(0, (f[def.id as ShipKind] ?? 1) - 1) }))}
                          className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[var(--cyan)] text-xs"
                        >−</button>
                        <span className="text-sm font-display neon-cyan w-4 text-center">{fleet[def.id as ShipKind] ?? 0}</span>
                        <button
                          type="button"
                          onClick={() => setFleet((f) => ({ ...f, [def.id]: Math.min(5, (f[def.id as ShipKind] ?? 1) + 1) }))}
                          className="w-6 h-6 rounded border border-border text-muted-foreground hover:text-foreground hover:border-[var(--cyan)] text-xs"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFleet({ ...DEFAULT_FLEET })}
                >
                  Reset to default
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-[var(--enemy)]">{error}</p>}

          <motion.button
            disabled={creating} 
            className="btn-cyber btn-pulse w-full"
            whileHover={{ scale: creating ? 1 : 1.02 }}
            whileTap={{ scale: creating ? 1 : 0.98 }}
            onHoverStart={() => setHoveredButton('create')}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <motion.span
              animate={{
                textShadow: hoveredButton === 'create' && !creating ? '0 0 30px oklch(0.96 0 0 / 0.8)' : '0 0 20px oklch(0.96 0 0 / 0.5)',
              }}
              transition={{ duration: 0.3 }}
            >
              {creating ? "Creating…" : "Create Battle & Get Link"}
            </motion.span>
          </motion.button>
        </form>
      </div>
    </div>
  );
}
