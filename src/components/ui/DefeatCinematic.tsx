"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface DefeatCinematicProps {
  show: boolean;
  onDismiss: () => void;
}

export function DefeatCinematic({ show, onDismiss }: DefeatCinematicProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (show) {
      setStage(0);
      const timers = [
        setTimeout(() => setStage(1), 300),
        setTimeout(() => setStage(2), 1000),
        setTimeout(() => setStage(3), 2000),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [show]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Static noise overlay */}
          {stage >= 1 && (
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, transparent 48%, rgba(255, 71, 87, 0.3) 49%, transparent 51%),
                  linear-gradient(-45deg, transparent 48%, rgba(255, 71, 87, 0.3) 49%, transparent 51%)
                `,
                backgroundSize: '4px 4px',
              }}
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 0.1,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          )}

          {/* Glitch lines */}
          {stage >= 1 && Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 bg-[var(--enemy)] opacity-30"
              initial={{ width: 0, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
              animate={{
                width: [0, Math.random() * 200 + 50, 0],
                x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 0.3,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: Math.random() * 2,
              }}
            />
          ))}

          {/* Red pulsing ring */}
          {stage >= 1 && (
            <motion.div
              className="absolute rounded-full border-4"
              style={{ borderColor: "var(--enemy)" }}
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{
                width: [0, 300, 600],
                height: [0, 300, 600],
                opacity: [1, 0.5, 0],
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          )}

          {/* Multiple warning rings */}
          {stage >= 1 && [0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-dashed"
              style={{ borderColor: "var(--enemy)" }}
              initial={{ width: 0, height: 0, opacity: 1, rotate: 0 }}
              animate={{
                width: [0, 400, 800],
                height: [0, 400, 800],
                opacity: [1, 0.4, 0],
                rotate: [0, 180, 360],
              }}
              transition={{ 
                duration: 2, 
                delay: i * 0.4,
                ease: "easeOut" 
              }}
            />
          ))}

          {/* Dark center void */}
          {stage >= 1 && (
            <motion.div
              className="absolute rounded-full bg-black"
              initial={{ width: 0, height: 0 }}
              animate={{
                width: [0, 100, 200],
                height: [0, 100, 200],
              }}
              transition={{ duration: 1, ease: "easeIn" }}
            />
          )}

          {/* Defeat Text with glitch effect */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={stage >= 2 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="font-display text-6xl md:text-8xl uppercase tracking-[0.2em] mb-4"
              style={{ color: "var(--enemy)" }}
              animate={
                stage >= 2
                  ? {
                      x: [0, -5, 5, -3, 3, 0],
                      opacity: [1, 0.8, 1, 0.9, 1],
                    }
                  : {}
              }
              transition={{
                duration: 0.3,
                repeat: stage >= 2 ? 3 : 0,
                repeatDelay: 0.5,
              }}
            >
              DEFEAT
            </motion.h1>
            <motion.p
              className="font-mono text-lg text-white/60"
              initial={{ opacity: 0 }}
              animate={stage >= 2 ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Fleet eliminated
            </motion.p>
          </motion.div>

          {/* System shutdown text */}
          {stage >= 2 && (
            <motion.div
              className="absolute top-10 left-10 font-mono text-xs text-[var(--enemy)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                ⚠ SYSTEM SHUTDOWN INITIATED
              </motion.div>
            </motion.div>
          )}

          {/* Dismiss button */}
          {stage >= 3 && (
            <motion.button
              onClick={onDismiss}
              className="absolute bottom-20 px-8 py-3 btn-danger"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05, x: [-2, 2, -2] }}
              whileTap={{ scale: 0.95 }}
            >
              Return to Base
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
