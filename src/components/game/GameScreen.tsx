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
    <div className="h-[calc(100vh-80px)] p-4 grid grid-rows-[1fr_auto] gap-4">
      {/* Main Game Area */}
      <div className="grid lg:grid-cols-[1fr_280px_1fr] gap-4 min-h-0">
        <section className="glass relative overflow-hidden min-h-[300px]">
          <div className="absolute top-3 left-3 z-10 font-display text-xs uppercase tracking-widest neon-cyan">Allied Fleet</div>
          <GameBoard3D board={player} isEnemy={false} revealShips />
        </section>

        <section className="glass p-4 flex flex-col">
          <h3 className="font-display uppercase tracking-widest text-xs neon-cyan mb-3">Comms Log</h3>
          <ul className="text-xs space-y-1.5 font-mono overflow-y-auto flex-1">
            {log.map((l, i) => (
              <li key={i} className="text-muted-foreground" style={{ opacity: 1 - i * 0.1 }}>› {l}</li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <div>Enemy ships down: <span className="neon-enemy">{enemy.ships.filter((s) => s.hits >= s.size).length}/5</span></div>
            <div>Allied ships down: <span className="neon-cyan">{player.ships.filter((s) => s.hits >= s.size).length}/5</span></div>
          </div>
        </section>

        <section className="glass relative overflow-hidden min-h-[300px]">
          <div className="absolute top-3 left-3 z-10 font-display text-xs uppercase tracking-widest neon-enemy">Enemy Waters</div>
          <div className="absolute top-3 right-3 z-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Right-click to mark</div>
          <GameBoard3D
            board={enemy}
            isEnemy
            revealShips={phase === "over"}
            onCellClick={(x, y) => playerFire(x, y)}
            onCellRightClick={(x, y) => toggleEnemyMark(x, y)}
          />
        </section>
      </div>

      {/* Floating Command Dock at Bottom */}
      <motion.div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass px-8 py-4 flex items-center gap-6 rounded-2xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center gap-4">
          <motion.span 
            className="font-display uppercase tracking-widest text-sm"
            animate={{ color: turn === "player" ? "var(--cyan)" : "var(--enemy)" }}
            transition={{ duration: 0.3 }}
          >
            Turn: {turn === "player" ? "Player" : "Enemy"}
          </motion.span>
          <span className="text-xs text-muted-foreground">Difficulty: <span className="text-foreground uppercase">{difficulty}</span></span>
          <span className="text-xs text-muted-foreground">Shots: {shotsFired}</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <motion.button 
          className="btn-danger !py-2 !px-6 !text-xs"
          onClick={() => { sfx.click(); setPhase("setup"); }}
          whileHover={{ scale: 1.05, rotate: [-2, 2, -2] }}
          whileTap={{ scale: 0.95 }}
        >
          Surrender
        </motion.button>
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
