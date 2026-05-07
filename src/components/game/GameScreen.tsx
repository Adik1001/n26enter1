import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GameBoard3D } from "./GameBoard3D";
import { CyberModal } from "./CyberModal";
import { SunkBanner } from "./SunkBanner";
import { PlacementBoard } from "./PlacementBoard";
import { ScreenEffect } from "@/components/ui/ScreenEffect";
import { VictoryCinematic } from "@/components/ui/VictoryCinematic";
import { DefeatCinematic } from "@/components/ui/DefeatCinematic";
import {
  type BoardState, type PlacedShip, autoPlace, allSunk, fireAt, cellKey,
} from "@/lib/game/types";
import { aiMove, aiPostShot, createAI, type Difficulty } from "@/lib/game/ai";
import { sfx } from "@/lib/sound";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getOrCreatePlayerId, getSavedNickname, upsertLeaderboard } from "@/lib/multiplayer";

type Phase = "setup" | "playing" | "over";

export function GameScreen({ onBack }: { onBack?: () => void }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [player, setPlayer] = useState<BoardState>({ ships: [], shots: {} });
  const [enemy, setEnemy] = useState<BoardState>({ ships: [], shots: {} });
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [log, setLog] = useState<string[]>([]);
  const [modal, setModal] = useState<{
    variant: "info" | "win" | "lose" | "danger"; title: string; body?: string;
  } | null>(null);
  const [boardsRevealed, setBoardsRevealed] = useState(false);
  const [sunk, setSunk] = useState<{ name: string; side: "enemy" | "player" } | null>(null);
  const [shotsFired, setShotsFired] = useState(0);
  const [screenEffect, setScreenEffect] = useState<"hit-enemy" | "hit-player" | "sunk-enemy" | "sunk-player" | null>(null);
  const [showCinematic, setShowCinematic] = useState<"victory" | "defeat" | null>(null);
  const startTime = useRef<number>(0);
  const aiMem = useRef(createAI());
  const savedRef = useRef(false);

  function startMatch(ships: PlacedShip[]) {
    setPlayer({ ships: ships.map((s) => ({ ...s, hits: 0 })), shots: {} });
    setEnemy({ ships: autoPlace(), shots: {} });
    setLog(["Battle commenced. Awaiting fire command."]);
    setShotsFired(0);
    setTurn("player");
    aiMem.current = createAI();
    savedRef.current = false;
    startTime.current = Date.now();
    setSunk(null);
    setBoardsRevealed(false);
    setPhase("playing");
  }

  function pushLog(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 8));
  }

  async function recordMatch(result: "win" | "loss") {
    if (savedRef.current) return;
    savedRef.current = true;
    const shipsDestroyed = enemy.ships.filter((s) => s.hits >= s.size).length;
    if (user) {
      await supabase.from("matches").insert({
        user_id: user.id,
        result,
        difficulty,
        ships_destroyed: shipsDestroyed,
        shots_fired: shotsFired,
        duration_seconds: Math.floor((Date.now() - startTime.current) / 1000),
      });
    }
    if (result === "win") {
      const playerId = getOrCreatePlayerId();
      const nick = getSavedNickname() || (user?.email?.split("@")[0] ?? "Commander");
      void upsertLeaderboard(playerId, nick, "win");
    }
  }

  function playerFire(x: number, y: number) {
    if (turn !== "player" || phase !== "playing") return;
    if (enemy.shots[cellKey(x, y)]) return;
    const { board, outcome, ship } = fireAt(enemy, x, y);
    // Preserve user marks; clear the mark on the fired cell.
    const marks = { ...(enemy.marks ?? {}) };
    delete marks[cellKey(x, y)];
    setEnemy({ ...board, marks });
    setShotsFired((n) => n + 1);
    if (outcome === "miss") { sfx.miss(); pushLog(`Miss at ${String.fromCharCode(65 + x)}${y + 1}`); }
    else if (outcome === "hit") { 
      sfx.hit(); 
      pushLog(`Direct hit at ${String.fromCharCode(65 + x)}${y + 1}`);
      setScreenEffect("hit-enemy");
    }
    else if (outcome === "sunk" && ship) {
      sfx.sunk();
      pushLog(`Enemy ${ship.name} destroyed!`);
      setSunk({ name: ship.name, side: "enemy" });
      setScreenEffect("sunk-enemy");
    }
    if (allSunk(board)) {
      setTimeout(() => {
        sfx.win();
        setPhase("over");
        setModal({ variant: "win", title: "Victory", body: "Enemy fleet annihilated. Command salutes you." });
        setShowCinematic("victory");
        recordMatch("win");
      }, 350);
      return;
    }
    if (outcome === "miss") setTurn("enemy");
  }

  function toggleEnemyMark(x: number, y: number) {
    const k = cellKey(x, y);
    if (enemy.shots[k]) return;
    sfx.click();
    setEnemy((b) => {
      const marks = { ...(b.marks ?? {}) };
      if (marks[k]) delete marks[k]; else marks[k] = true;
      return { ...b, marks };
    });
  }

  useEffect(() => { if (phase === "over") setSunk(null); }, [phase]);

  const [enemyTick, setEnemyTick] = useState(0);
  // Enemy turn
  useEffect(() => {
    if (phase !== "playing" || turn !== "enemy") return;
    const t = setTimeout(() => {
      const move = aiMove(difficulty, player, aiMem.current);
      const { board, outcome, ship } = fireAt(player, move.x, move.y);
      setPlayer(board);
      aiPostShot(aiMem.current, move.x, move.y, outcome, board);
      if (outcome === "miss") { sfx.miss(); pushLog(`Enemy missed at ${String.fromCharCode(65 + move.x)}${move.y + 1}`); }
      else if (outcome === "hit") { 
        sfx.hit(); 
        pushLog(`Enemy hit at ${String.fromCharCode(65 + move.x)}${move.y + 1}`);
        setScreenEffect("hit-player");
      }
      else if (outcome === "sunk" && ship) {
        sfx.sunk();
        pushLog(`Your ${ship.name} was destroyed!`);
        setSunk({ name: ship.name, side: "player" });
        setScreenEffect("sunk-player");
      }
      if (allSunk(board)) {
        setTimeout(() => {
          sfx.lose();
          setPhase("over");
          setModal({ variant: "lose", title: "Defeat", body: "Fleet eliminated. Stand down." });
          setShowCinematic("defeat");
          recordMatch("loss");
        }, 350);
        return;
      }
      if (outcome === "miss") setTurn("player");
      else setEnemyTick((n) => n + 1); // hit/sunk: another enemy turn
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, enemyTick]);

  if (phase === "setup") {
    return (
      <div className="h-[calc(100vh-80px)] p-4">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <motion.button 
              onClick={() => { sfx.click(); onBack(); }} 
              className="text-muted-foreground hover:text-foreground text-xs font-display uppercase tracking-widest"
              whileHover={{ x: -5, color: "var(--cyan)" }}
              whileTap={{ scale: 0.95 }}
            >
              ← Lobby
            </motion.button>
          )}
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Difficulty:</span>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <motion.button 
              key={d}
              onClick={() => { sfx.click(); setDifficulty(d); }}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              className={`px-3 py-1 rounded-md text-xs uppercase font-display tracking-widest border transition ${
                difficulty === d ? "border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan)]/10" : "border-border text-muted-foreground"
              }`}
            >{d}</motion.button>
          ))}
        </div>
        <PlacementBoard onConfirm={startMatch} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] relative">
      {/* Top HUD Bar - slides in from top */}
      <motion.div
        className="fixed top-20 left-0 right-0 z-40 h-16 glass flex items-center justify-between px-6"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
      >
        {/* Left: Player Stats */}
        <div className="flex items-center gap-6">
          <div className="text-xs font-mono">
            <div className="text-[var(--cyan)]/70 mb-1">ALLIED FLEET</div>
            <div className="text-lg font-bold text-[var(--cyan)]">
              {player.ships.filter((s) => s.hits >= s.size).length}/5
              <span className="text-xs ml-1">SUNK</span>
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--cyan)]/30" />
          <div className="text-xs font-mono">
            <div className="text-[var(--enemy)]/70 mb-1">ENEMY FLEET</div>
            <div className="text-lg font-bold text-[var(--enemy)]">
              {enemy.ships.filter((s) => s.hits >= s.size).length}/5
              <span className="text-xs ml-1">SUNK</span>
            </div>
          </div>
        </div>

        {/* Center: Turn Indicator */}
        <motion.div
          className="text-center"
          animate={{
            borderColor: turn === "player" ? "var(--cyan)" : "var(--enemy)",
            boxShadow: turn === "player" 
              ? "0 0 20px rgba(0, 255, 65, 0.3)" 
              : "0 0 20px rgba(255, 0, 0, 0.3)"
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs font-mono text-white/50 mb-1">CURRENT TURN</div>
          <div className="text-2xl font-bold font-mono">
            {turn === "player" ? (
              <span className="text-[var(--cyan)]">PLAYER</span>
            ) : (
              <span className="text-[var(--enemy)]">ENEMY</span>
            )}
          </div>
        </motion.div>

        {/* Right: Game Stats */}
        <div className="flex items-center gap-6">
          <div className="text-xs font-mono text-right">
            <div className="text-white/50 mb-1">SHOTS FIRED</div>
            <div className="text-lg font-bold">{shotsFired}</div>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-xs font-mono text-right">
            <div className="text-white/50 mb-1">DIFFICULTY</div>
            <div className="text-lg font-bold uppercase">{difficulty}</div>
          </div>
        </div>
      </motion.div>

      {/* Main 3D View Area - Full width, no side panels */}
      <div className="pt-20 pb-48 px-4 h-full flex items-center justify-center gap-4">
        {/* Player Board - Left */}
        <motion.section
          className="w-[45%] h-[70vh] glass relative overflow-hidden"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute top-3 left-3 z-10 font-mono text-xs uppercase tracking-widest text-[var(--cyan)] bg-black/50 px-2 py-1">
            ALLIED FLEET
          </div>
          <GameBoard3D board={player} isEnemy={false} revealShips />
        </motion.section>

        {/* Enemy Board - Right */}
        <motion.section
          className="w-[45%] h-[70vh] glass relative overflow-hidden"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
        >
          <div className="absolute top-3 left-3 z-10 font-mono text-xs uppercase tracking-widest text-[var(--enemy)] bg-black/50 px-2 py-1">
            ENEMY WATERS
          </div>
          <div className="absolute top-3 right-3 z-10 font-mono text-[10px] uppercase tracking-widest text-white/50 bg-black/50 px-2 py-1">
            RIGHT-CLICK TO MARK
          </div>
          <GameBoard3D
            board={enemy}
            isEnemy
            revealShips={phase === "over"}
            onCellClick={(x, y) => playerFire(x, y)}
            onCellRightClick={(x, y) => toggleEnemyMark(x, y)}
          />
        </motion.section>
      </div>

      {/* Bottom HUD Dashboard - slides in from bottom */}
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-4xl glass flex gap-4 p-4"
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
      >
        {/* Comms Log */}
        <div className="flex-1">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--cyan)] mb-2">
            COMMS LOG
          </div>
          <ul className="text-xs space-y-1 font-mono h-24 overflow-y-auto">
            {log.map((l, i) => (
              <li key={i} className="text-white/70" style={{ opacity: 1 - i * 0.1 }}>› {l}</li>
            ))}
          </ul>
        </div>

        <div className="h-full w-px bg-white/20" />

        {/* Actions */}
        <div className="flex items-center gap-4">
          <motion.button
            className="btn-danger !py-3 !px-6 !text-xs"
            onClick={() => { sfx.click(); setPhase("setup"); }}
            whileHover={{ scale: 1.05, rotate: [-2, 2, -2] }}
            whileTap={{ scale: 0.95 }}
          >
            ABORT MISSION
          </motion.button>
        </div>
      </motion.div>

      <SunkBanner shipName={sunk?.name ?? null} side={sunk?.side ?? "enemy"} />
      <ScreenEffect type={screenEffect} />
      <VictoryCinematic 
        show={showCinematic === "victory"} 
        onDismiss={() => setShowCinematic(null)} 
      />
      <DefeatCinematic 
        show={showCinematic === "defeat"} 
        onDismiss={() => setShowCinematic(null)} 
      />

      <CyberModal
        open={!!modal && !boardsRevealed}
        variant={modal?.variant ?? "info"}
        title={modal?.title ?? ""}
        onClose={() => phase === "over" ? null : setModal(null)}
        actions={
          phase === "over" ? (
            <>
              <button className="btn-cyber" onClick={() => setBoardsRevealed(true)}>View Boards</button>
              <button className="btn-cyber" onClick={() => { setModal(null); setPhase("setup"); }}>New Battle</button>
              <a className="btn-danger" href="/stats">View Stats</a>
            </>
          ) : null
        }
      >
        {modal?.body}
      </CyberModal>

      {phase === "over" && boardsRevealed && (
        <motion.div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass px-6 py-3 flex items-center gap-4 rounded-xl"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <motion.button 
            className="btn-cyber text-xs" 
            onClick={() => { setModal(null); setPhase("setup"); }}
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, -5, 0] }}
            whileTap={{ scale: 0.95 }}
          >
            New Battle
          </motion.button>
          <motion.a 
            className="btn-danger text-xs" 
            href="/stats"
            whileHover={{ scale: 1.05, x: [0, -3, 3, -3, 0] }}
            whileTap={{ scale: 0.95 }}
          >
            View Stats
          </motion.a>
        </motion.div>
      )}
    </div>
  );
}
