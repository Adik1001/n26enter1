"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

export function CursorEffect() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const trailRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsMoving(false);
      }, 100);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const particles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <>
      <motion.div
        className="fixed pointer-events-none z-[9999] mix-blend-screen"
        animate={{
          x: mousePosition.x - 20,
          y: mousePosition.y - 20,
          scale: isMoving ? 1 : 0.5,
          opacity: isMoving ? 1 : 0.3,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 28,
          mass: 0.5,
        }}
        style={{
          width: 40,
          height: 40,
        }}
      >
        <div className="relative w-full h-full">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--cyan)] opacity-60" />
          
          {/* Inner crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-0.5 bg-[var(--cyan)] opacity-80" />
            <div className="h-3 w-0.5 bg-[var(--cyan)] opacity-80 absolute" />
          </div>
          
          {/* Glowing center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[var(--cyan)] rounded-full shadow-[0_0_12px_var(--cyan),0_0_24px_var(--cyan)]" />
          </div>
        </div>
      </motion.div>

      {/* Particle trail */}
      {particles.map((i) => (
        <motion.div
          key={i}
          className="fixed pointer-events-none z-[9998] w-1.5 h-1.5 rounded-full bg-[var(--cyan)] opacity-40"
          animate={{
            x: mousePosition.x - 3,
            y: mousePosition.y - 3,
            scale: isMoving ? 1 - (i * 0.1) : 0,
            opacity: isMoving ? 0.6 - (i * 0.07) : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400 - (i * 40),
            damping: 30 + (i * 5),
            mass: 0.3 + (i * 0.05),
            delay: i * 0.02,
          }}
          style={{
            boxShadow: `0 0 ${8 + i * 2}px var(--cyan)`,
          }}
        />
      ))}

      {/* Subtle glow following cursor */}
      <motion.div
        className="fixed pointer-events-none z-[9997] rounded-full blur-3xl"
        animate={{
          x: mousePosition.x - 100,
          y: mousePosition.y - 100,
          opacity: isMoving ? 0.15 : 0.05,
        }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 40,
          mass: 1,
        }}
        style={{
          width: 200,
          height: 200,
          background: "radial-gradient(circle, var(--cyan) 0%, transparent 70%)",
        }}
      />
    </>
  );
}
