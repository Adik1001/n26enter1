"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface VictoryCinematicProps {
  show: boolean;
  onDismiss: () => void;
}

export function VictoryCinematic({ show, onDismiss }: VictoryCinematicProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (show) {
      setStage(0);
      const timers = [
        setTimeout(() => setStage(1), 500),
        setTimeout(() => setStage(2), 1500),
        setTimeout(() => setStage(3), 2500),
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
          transition={{ duration: 0.5 }}
        >
          {/* Expanding success ring */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 1 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="rounded-full border-4"
              style={{ borderColor: "var(--cyan)" }}
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{
                width: [0, 300, 600, 1200],
                height: [0, 300, 600, 1200],
                opacity: [1, 0.8, 0.4, 0],
              }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </motion.div>

          {/* Multiple expanding rings */}
          {stage >= 1 && [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2"
              style={{ borderColor: "var(--cyan)" }}
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{
                width: [0, 400, 800, 1600],
                height: [0, 400, 800, 1600],
                opacity: [1, 0.6, 0.3, 0],
              }}
              transition={{ 
                duration: 2.5, 
                delay: i * 0.3,
                ease: "easeOut" 
              }}
            />
          ))}

          {/* Glowing center burst */}
          {stage >= 1 && (
            <motion.div
              className="absolute rounded-full bg-[var(--cyan)] blur-3xl"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: [0, 200, 400],
                height: [0, 200, 400],
                opacity: [0, 0.8, 0],
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          )}

          {/* Victory Text */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={stage >= 2 ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.h1
              className="font-display text-6xl md:text-8xl uppercase tracking-[0.2em] mb-4"
              style={{ color: "var(--cyan)" }}
              animate={{
                textShadow: stage >= 2 
                  ? ["0 0 20px rgba(0, 255, 136, 0.5)", "0 0 40px rgba(0, 255, 136, 0.8)", "0 0 60px rgba(0, 255, 136, 1)"]
                  : "none",
              }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              Victory
            </motion.h1>
            <motion.p
              className="font-mono text-lg text-white/80"
              initial={{ opacity: 0 }}
              animate={stage >= 2 ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Enemy fleet annihilated
            </motion.p>
          </motion.div>

          {/* Particle burst */}
          {stage >= 1 && Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-[var(--cyan)]"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i / 20) * Math.PI * 2) * 400,
                y: Math.sin((i / 20) * Math.PI * 2) * 400,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1.5, delay: i * 0.02, ease: "easeOut" }}
            />
          ))}

          {/* Dismiss button */}
          {stage >= 3 && (
            <motion.button
              onClick={onDismiss}
              className="absolute bottom-20 px-8 py-3 btn-cyber"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
