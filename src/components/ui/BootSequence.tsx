"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [stage, setStage] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  const bootText = [
    "SYSTEM BOOT SEQUENCE INITIATED...",
    "LOADING KERNEL MODULES...",
    "INITIALIZING TACTICAL INTERFACE...",
    "LOADING 3D RENDERING ENGINE...",
    "ESTABLISHING SECURE CONNECTION...",
    "CALIBRATING SENSORS...",
    "WEAPON SYSTEMS ONLINE...",
    "TACTICAL DISPLAY READY...",
  ];

  useEffect(() => {
    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < bootText.length) {
        setLines((prev) => [...prev, bootText[lineIndex]]);
        lineIndex++;
      } else {
        clearInterval(interval);
        setStage(1);
        setTimeout(() => {
          setStage(2);
          setTimeout(onComplete, 500);
        }, 800);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center font-mono"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-pulse" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
          backgroundSize: '100% 4px'
        }} />
      </div>

      {/* Terminal text */}
      <div className="relative z-10 w-full max-w-2xl px-8">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            className="text-green-500 text-sm mb-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-green-500/50 mr-2">[{String(i + 1).padStart(3, '0')}]</span>
            {line}
          </motion.div>
        ))}
        
        {/* Blinking cursor */}
        {stage === 0 && (
          <motion.span
            className="inline-block w-3 h-5 bg-green-500 ml-2"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>

      {/* Loading bar */}
      {stage === 1 && (
        <motion.div
          className="absolute bottom-32 left-1/2 -translate-x-1/2 w-96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="h-2 bg-green-500/20 border border-green-500/50 clip-path-polygon">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, ease: "linear" }}
            />
          </div>
          <div className="text-center text-green-500 text-xs mt-2 tracking-widest">
            INITIALIZING TACTICAL SYSTEMS
          </div>
        </motion.div>
      )}

      {/* Success message */}
      {stage === 2 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-green-500 text-4xl font-bold tracking-[0.5em]">
            SYSTEM READY
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
