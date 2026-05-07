import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { CyberModal } from "@/components/game/CyberModal";
import { Toaster } from "sonner";
import { CursorEffect } from "@/components/ui/CursorEffect";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { BootSequence } from "@/components/ui/BootSequence";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md text-center p-10">
        <h1 className="font-display text-7xl neon-cyan">404</h1>
        <h2 className="mt-4 text-xl font-display uppercase tracking-widest">Signal Lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">No transmission from this sector.</p>
        <Link to="/" className="btn-cyber mt-6 inline-flex">Return to Command</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Battleship" },
      { name: "description", content: "A battleship game" },
      { property: "og:title", content: "Battleship" },
      { name: "twitter:title", content: "Battleship" },
      { property: "og:description", content: "A battleship game" },
      { name: "twitter:description", content: "A battleship game" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cc-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      className="px-3 py-1.5 text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border rounded-md"
    >
      {theme === "dark" ? "☾ Dark" : "☀ Light"}
    </button>
  );
}

function NavBar() {
  const { user, signOut } = useAuth();
  const [rules, setRules] = useState(false);
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-20 glass flex items-center justify-between px-6"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
        }}
      >
        {/* Centered Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              className="w-10 h-10 border border-[var(--cyan)]/50 flex items-center justify-center font-mono text-lg bg-black/50"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))'
              }}
              whileHover={{ scale: 1.1, rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              ⌬
            </motion.div>
            <motion.div
              className="font-mono uppercase tracking-[0.2em] text-sm text-[var(--cyan)]"
              whileHover={{ letterSpacing: "0.25em" }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-[var(--cyan)]">BATTLE</span>SHIP
            </motion.div>
          </Link>
        </div>

        {/* Left side - Play & Stats */}
        <nav className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/play" className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-[var(--cyan)] transition-colors bg-black/30"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              PLAY
            </Link>
          </motion.div>
          {user && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/stats" className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-[var(--cyan)] transition-colors bg-black/30"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                }}
              >
                STATS
              </Link>
            </motion.div>
          )}
        </nav>

        {/* Right side - Actions */}
        <nav className="flex items-center gap-3">
          <motion.button
            onClick={() => setRules(true)}
            className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/50 hover:text-white transition-colors bg-black/30"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            RULES
          </motion.button>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {user ? (
            <motion.button 
              onClick={() => signOut()} 
              className="btn-danger !py-2 !px-4 !text-xs"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              LOGOUT
            </motion.button>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="btn-cyber !py-2 !px-4 !text-xs">
                LOGIN
              </Link>
            </motion.div>
          )}
        </nav>
      </header>
      <CyberModal
        open={rules}
        variant="info"
        title="Rules"
        onClose={() => setRules(false)}
        actions={
          <motion.button 
            className="btn-cyber" 
            onClick={() => setRules(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Got it
          </motion.button>
        }
      >
        <div className="text-left space-y-2 text-sm">
          <p>• Place 5 ships on your 10×10 grid. Ships cannot touch — not even diagonally.</p>
          <p>• Players take turns firing at the enemy grid. A miss ends your turn; a hit lets you fire again.</p>
          <p>• <span className="neon-cyan">Left-click</span> a cell on enemy waters to fire.</p>
          <p>• <span className="neon-enemy">Right-click</span> a cell to mark it as a "no ship" guess (toggle).</p>
          <p>• Sink all five enemy ships (Carrier 5, Battleship 4, Destroyer 3, Submarine 3, Patrol 2) to win.</p>
          <p>• Difficulty: Easy = random, Medium = hunts adjacent after a hit, Hard = probability-density targeting.</p>
        </div>
      </CyberModal>
    </>
  );
}

function RootComponent() {
  const theme = typeof document !== "undefined" ? document.documentElement.classList.contains("light") ? "light" : "dark" : "dark";
  const [bootComplete, setBootComplete] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen">
          <AmbientBackground />
          <CursorEffect />
          {!bootComplete && (
            <BootSequence onComplete={() => setBootComplete(true)} />
          )}
          {bootComplete && (
            <>
              <NavBar />
              <main className="relative z-10">
                <Outlet />
              </main>
            </>
          )}
          <Toaster theme={theme} position="top-right" />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
