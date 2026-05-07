"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ScreenEffectProps {
  type: "hit-enemy" | "hit-player" | "sunk-enemy" | "sunk-player" | null;
}

export function ScreenEffect({ type }: ScreenEffectProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [type]);

  if (!type || !visible) return null;

  const isEnemy = type.includes("enemy");
  const isSunk = type.includes("sunk");
  const color = isEnemy ? "rgba(0, 255, 136, 0.15)" : "rgba(255, 71, 87, 0.15)";

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Flash overlay */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, isSunk ? 0.4 : 0.2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ backgroundColor: color }}
          />

          {/* Shockwave effect for sinks */}
          {isSunk && (
            <motion.div
              className="fixed inset-0 pointer-events-none z-[99] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="rounded-full border-4"
                style={{ borderColor: isEnemy ? "var(--cyan)" : "var(--enemy)" }}
                initial={{ width: 0, height: 0, opacity: 1 }}
                animate={{
                  width: [0, 400, 800],
                  height: [0, 400, 800],
                  opacity: [1, 0.5, 0],
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </motion.div>
          )}

          {/* Screen shake effect */}
          {isSunk && (
            <motion.div
              className="fixed inset-0 pointer-events-none z-[101]"
              animate={{
                x: [0, -5, 5, -3, 3, 0],
                y: [0, -5, 5, -3, 3, 0],
              }}
              transition={{ duration: 0.5 }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
