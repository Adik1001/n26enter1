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
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <motion.div
        className="glass max-w-3xl w-full p-12 space-y-10"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-mono text-4xl uppercase tracking-[0.2em] text-[var(--cyan)]">MISSION SELECT</h1>
            <p className="text-sm text-white/50 mt-2 font-mono uppercase tracking-widest">Select combat mode. Engage.</p>
          </div>
          <a href="/leaderboard" className="text-xs text-white/50 hover:text-[var(--cyan)] transition font-mono uppercase tracking-widest">
            Leaderboard →
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-8">
          <motion.button
            onClick={() => { sfx.click(); onSelectBot(); }}
            className="glass p-8 text-left space-y-4 border border-[var(--cyan)]/30 relative overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
            }}
            whileHover={{ scale: 1.02, y: -4, borderColor: 'rgba(0, 255, 65, 0.6)' }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHoveredCard('bot')}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-[var(--cyan)]/10 to-transparent opacity-0"
              animate={{ opacity: hoveredCard === 'bot' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            <div className="relative z-10">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-mono">SOLO OPERATIONS</div>
              <div>
                <motion.div 
                  className="font-mono text-xl uppercase tracking-widest text-[var(--cyan)]"
                  animate={{
                    textShadow: hoveredCard === 'bot' ? '0 0 20px rgba(0, 255, 65, 0.8)' : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  VS BOT
                </motion.div>
                <div className="text-xs text-white/50 mt-1 font-mono">Adaptive AI with three difficulty levels</div>
              </div>
              <div className="text-xs text-white/50 font-mono">UNLIMITED · OFFLINE COMBAT</div>
            </div>
          </motion.button>

          <motion.button
            onClick={() => { sfx.click(); onSelectMultiplayer(); }}
            className="glass p-8 text-left space-y-4 border border-[var(--enemy)]/30 relative overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
            }}
            whileHover={{ scale: 1.02, y: -4, borderColor: 'rgba(255, 0, 0, 0.6)' }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHoveredCard('mp')}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-[var(--enemy)]/10 to-transparent opacity-0"
              animate={{ opacity: hoveredCard === 'mp' ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            <div className="relative z-10">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-mono">MULTIPLAYER OPS</div>
              <div>
                <motion.div 
                  className="font-mono text-xl uppercase tracking-widest text-[var(--enemy)]"
                  animate={{
                    textShadow: hoveredCard === 'mp' ? '0 0 20px rgba(255, 0, 0, 0.8)' : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  MULTIPLAYER
                </motion.div>
                <div className="text-xs text-white/50 mt-1 font-mono">Share a link. Play 2–4 players in realtime</div>
              </div>
              <div className="text-xs text-white/50 font-mono">TIMED OR UNLIMITED · CUSTOM FLEETS</div>
            </div>
          </motion.button>
        </div>
      </motion.div>
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
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-6">
      <motion.div
        className="glass max-w-lg w-full p-8 space-y-6 overflow-y-auto max-h-[90vh]"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <motion.button 
            onClick={() => { sfx.click(); onBack(); }} 
            className="text-white/50 hover:text-[var(--cyan)] text-sm font-mono uppercase tracking-widest"
            whileHover={{ x: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            ← ABORT
          </motion.button>
          <h2 className="font-mono text-xl uppercase tracking-widest text-[var(--cyan)]">NEW BATTLE</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-white/50">OPERATOR CALLSIGN</label>
            <input
              type="text"
              className="input-cyber mt-1 font-mono text-sm"
              placeholder="COMMANDER"
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 mb-2 block">OPERATORS</label>
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
                  className={`flex-1 py-3 text-sm font-mono uppercase tracking-widest border transition relative overflow-hidden ${
                    playerCount === n
                      ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10"
                      : "border-white/20 text-white/50"
                  }`}
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
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
              <p className="text-xs text-white/50 mt-1 font-mono">
                Operators share a room link. Turn-based — select your target each round.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 mb-2 block">TIMER MODE</label>
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
                  className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest border transition relative overflow-hidden ${
                    gameMode === m
                      ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10"
                      : "border-white/20 text-white/50"
                  }`}
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                  }}
                >
                  <motion.span
                    animate={{
                      scale: hoveredButton === `mode-${m}` ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {m === "infinite" ? "∞ NO LIMIT" : m === "4min" ? "4 MIN" : "10 MIN"}
                  </motion.span>
                </motion.button>
              ))}
            </div>
            {gameMode !== "infinite" && (
              <p className="text-xs text-white/50 mt-1 font-mono">
                Each operator's clock only ticks on their own turn. Most ships sunk wins on timeout.
              </p>
            )}
          </div>

          <motion.button
            type="button"
            onClick={() => { sfx.click(); setShowAdvanced((v) => !v); }}
            className="text-xs text-white/50 hover:text-[var(--cyan)] transition w-full text-left font-mono uppercase tracking-widest"
            whileHover={{ x: 5 }}
          >
            {showAdvanced ? "▼" : "▶"} ADVANCED SETTINGS
          </motion.button>

          {showAdvanced && (
            <motion.div
              className="space-y-4 border border-white/20 p-4"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))'
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-white/50">GRID SIZE</label>
                  <span className="text-xs font-mono text-[var(--cyan)]">{gridSize}×{gridSize}</span>
                </div>
                <input
                  type="range" min={8} max={16} step={1} value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-full accent-[var(--cyan)]"
                />
                <div className="flex justify-between text-[10px] text-white/50 mt-1 font-mono">
                  <span>8×8</span><span>12×12</span><span>16×16</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-white/50">FLEET CONFIGURATION</label>
                  <span className="text-xs font-mono text-white/50">{total} ships</span>
                </div>
                <div className="space-y-2">
                  {SHIP_TYPES.map((def) => (
                    <div key={def.id} className="flex items-center gap-3">
                      <span className="text-xs text-white/50 w-24 font-mono">{def.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: def.size }).map((_, i) => (
                          <div key={i} className="w-3 h-3 bg-[var(--cyan)]/40" style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setFleet((f) => ({ ...f, [def.id as ShipKind]: Math.max(0, (f[def.id as ShipKind] ?? 1) - 1) }))}
                          className="w-6 h-6 border border-white/20 text-white/50 hover:text-[var(--cyan)] hover:border-[var(--cyan)] text-xs font-mono"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                        >−</button>
                        <span className="text-sm font-mono text-[var(--cyan)] w-4 text-center">{fleet[def.id as ShipKind] ?? 0}</span>
                        <button
                          type="button"
                          onClick={() => setFleet((f) => ({ ...f, [def.id as ShipKind]: Math.min(5, (f[def.id as ShipKind] ?? 1) + 1) }))}
                          className="w-6 h-6 border border-white/20 text-white/50 hover:text-[var(--cyan)] hover:border-[var(--cyan)] text-xs font-mono"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs text-white/50 hover:text-[var(--cyan)] font-mono uppercase tracking-widest"
                  onClick={() => setFleet({ ...DEFAULT_FLEET })}
                >
                  RESET TO DEFAULT
                </button>
              </div>
            </motion.div>
          )}

          {error && <p className="text-xs text-[var(--enemy)] font-mono uppercase tracking-widest">⚠ {error}</p>}

          <motion.button
            disabled={creating} 
            className="btn-cyber w-full"
            whileHover={{ scale: creating ? 1 : 1.02 }}
            whileTap={{ scale: creating ? 1 : 0.98 }}
            onHoverStart={() => setHoveredButton('create')}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <motion.span
              animate={{
                textShadow: hoveredButton === 'create' && !creating ? '0 0 30px rgba(0, 255, 65, 0.8)' : '0 0 20px rgba(0, 255, 65, 0.5)',
              }}
              transition={{ duration: 0.3 }}
            >
              {creating ? "INITIALIZING..." : "CREATE BATTLE & GET LINK"}
            </motion.span>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
