import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Battleship" },
      { name: "description", content: "A high-end 3D Battleship arena. Play vs adaptive AI." },
    ],
  }),
});

export function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="glass max-w-md w-full p-8 text-center"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))'
        }}
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.h1
          className="font-mono text-4xl uppercase tracking-[0.2em] mb-2 text-[var(--cyan)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          BATTLESHIP
        </motion.h1>
        <motion.p
          className="font-mono text-xs text-white/50 mb-8 uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          TACTICAL COMBAT SIMULATION
        </motion.p>
        
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/play" className="btn-cyber w-full block">
              INITIALIZE MISSION
            </Link>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/login" className="btn-danger w-full block">
              OPERATOR LOGIN
            </Link>
          </motion.div>
        </motion.div>
        
        <motion.p
          className="text-[10px] text-white/30 text-center pt-6 font-mono uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          GUEST OPERATORS MAY ENGAGE IN FULL COMBAT SIMULATIONS
        </motion.p>
      </motion.div>
    </div>
  );
}
