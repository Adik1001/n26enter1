import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Battleship" },
      { name: "description", content: "A high-end 3D Battleship arena. Play vs adaptive AI." },
    ],
  }),
});

function Index() {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-10">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            Naval tactics, distilled
          </div>
          <h1 className="font-display text-5xl md:text-7xl uppercase leading-none">
            Battleship
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Everything you need. Nothing you don't.
          </p>
        </div>

        <div className="glass p-8 space-y-5">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setHoveredButton('play')}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <Link 
              to="/play" 
              className="btn-cyber btn-glow btn-shine w-full block text-center"
            >
              <motion.span
                animate={{
                  textShadow: hoveredButton === 'play' ? '0 0 30px oklch(0.96 0 0 / 0.8)' : '0 0 20px oklch(0.96 0 0 / 0.5)',
                }}
                transition={{ duration: 0.3 }}
              >
                Play
              </motion.span>
            </Link>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setHoveredButton('signin')}
            onHoverEnd={() => setHoveredButton(null)}
          >
            <Link 
              to="/login" 
              className="btn-danger btn-scale w-full block text-center"
            >
              <motion.span
                animate={{
                  textShadow: hoveredButton === 'signin' ? '0 0 35px oklch(0.62 0.25 25 / 0.8)' : '0 0 20px oklch(0.62 0.25 25 / 0.5)',
                }}
                transition={{ duration: 0.3 }}
              >
                Sign in
              </motion.span>
            </Link>
          </motion.div>
          
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Guests can play full matches. Sign in to save match history & stats.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
