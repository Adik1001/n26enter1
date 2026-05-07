import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { BoardState, PlacedShip } from "@/lib/game/types";
import { cellKey, shipCells } from "@/lib/game/types";

interface BoardProps {
  board: BoardState;
  isEnemy: boolean;
  revealShips: boolean;
  onCellClick?: (x: number, y: number) => void;
  onCellRightClick?: (x: number, y: number) => void;
  onCellHover?: (x: number, y: number | null) => void;
  hoverCell?: { x: number; y: number } | null;
  hoverPreview?: { cells: { x: number; y: number }[]; valid: boolean } | null;
  boardSize?: number;
  playerColor?: string; // hex color for this player's ships/accents
}

const CELL = 1;

function gridPos(x: number, y: number, boardSize: number): [number, number, number] {
  const OFFSET = (boardSize * CELL) / 2 - CELL / 2;
  return [x - OFFSET, 0, y - OFFSET];
}

function DestroyedShipEffect({ ship, color, boardSize }: { ship: PlacedShip; color: string; boardSize: number }) {
  const cells = shipCells(ship);
  const start = cells[0];
  const end = cells[cells.length - 1];
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;
  const len = ship.size * CELL * 0.95;
  const wid = CELL * 0.5;
  const rotY = ship.orientation === "h" ? 0 : Math.PI / 2;
  const particleCount = 30;
  
  const particles = useMemo(() => 
    Array.from({ length: particleCount }, () => ({
      position: [
        (Math.random() - 0.5) * len * 0.8,
        Math.random() * 0.5 + 0.3,
        (Math.random() - 0.5) * CELL * 0.5
      ] as [number, number, number],
      velocity: [
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.03 + 0.01,
        (Math.random() - 0.5) * 0.02
      ] as [number, number, number],
      size: Math.random() * 0.08 + 0.02
    }))
  , [len]);

  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state: any) => {
    if (meshRef.current) {
      meshRef.current.children.forEach((child: any, i: number) => {
        if (child.userData.velocity) {
          child.position.x += child.userData.velocity[0];
          child.position.y += child.userData.velocity[1];
          child.position.z += child.userData.velocity[2];
          child.userData.velocity[1] *= 0.98;
          child.material.opacity = Math.max(0, 1 - state.clock.elapsedTime * 0.3);
        }
      });
    }
  });

  return (
    <group ref={meshRef} position={gridPos(cx, cy, boardSize)} rotation={[0, rotY, 0]}>
      {/* Broken hull - tilted and fragmented */}
      <mesh position={[0, 0.05, 0]} rotation={[0.2, 0, 0.1]}>
        <boxGeometry args={[len * 0.7, 0.15, wid * 0.7]} />
        <meshStandardMaterial color="#1a1515" metalness={0.3} roughness={0.9} />
      </mesh>
      <mesh position={[-len * 0.2, 0.03, 0.1]} rotation={[-0.3, 0.2, 0]}>
        <boxGeometry args={[len * 0.25, 0.1, wid * 0.4]} />
        <meshStandardMaterial color="#251a1a" metalness={0.2} roughness={0.95} />
      </mesh>
      <mesh position={[len * 0.15, 0.02, -0.05]} rotation={[0.4, -0.1, 0.2]}>
        <boxGeometry args={[len * 0.2, 0.08, wid * 0.35]} />
        <meshStandardMaterial color="#1f1515" metalness={0.25} roughness={0.9} />
      </mesh>
      
      {/* Smoke/Spark particles */}
      {particles.map((p, i) => (
        <mesh key={i} position={p.position} userData={{ velocity: p.velocity }}>
          <sphereGeometry args={[p.size, 4, 4]} />
          <meshStandardMaterial 
            color={Math.random() > 0.5 ? "#ff4400" : "#888888"} 
            emissive={Math.random() > 0.5 ? "#ff2200" : "#444444"}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function ShipMesh({ ship, color, sunk, boardSize }: { ship: PlacedShip; color: string; sunk: boolean; boardSize: number }) {
  const cells = shipCells(ship);
  const start = cells[0];
  const end = cells[cells.length - 1];
  const cx = (start.x + end.x) / 2;
  const cy = (start.y + end.y) / 2;
  const len = ship.size * CELL * 0.95;
  const wid = CELL * 0.5;
  const rotY = ship.orientation === "h" ? 0 : Math.PI / 2;

  const hullColor = sunk ? "#3a3838" : color;
  const deckColor = "#0a1520";
  const accentEmissive = sunk ? 0.15 : 0.8;
  const turretCount = Math.max(1, ship.size - 2);

  // Different ship types based on size
  const isCarrier = ship.size >= 5;
  const isBattleship = ship.size === 4;
  const isSubmarine = ship.size === 3;

  return (
    <group position={gridPos(cx, cy, boardSize)} rotation={[0, rotY, 0]}>
      {/* Main Hull - multiple segments for detail */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[len * 0.85, 0.25, wid * 0.9]} />
        <meshStandardMaterial color={hullColor} metalness={0.8} roughness={0.3} emissive={color} emissiveIntensity={accentEmissive * 0.4} toneMapped={false} />
      </mesh>
      
      {/* Bow (front) - pointed shape */}
      <mesh position={[len * 0.42 + len * 0.05, 0.15, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[wid * 0.45, len * 0.25, 6]} />
        <meshStandardMaterial color={hullColor} metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Stern (back) - tapered */}
      <mesh position={[-len * 0.42 - len * 0.02, 0.15, 0]}>
        <boxGeometry args={[len * 0.08, 0.2, wid * 0.8]} />
        <meshStandardMaterial color={hullColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Main Deck */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[len * 0.75, 0.03, wid * 0.8]} />
        <meshStandardMaterial color={deckColor} metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Bridge/Command Tower */}
      <mesh position={[-len * 0.15, 0.35, 0]}>
        <boxGeometry args={[len * 0.2, 0.15, wid * 0.4]} />
        <meshStandardMaterial color={deckColor} metalness={0.7} roughness={0.4} emissive={color} emissiveIntensity={accentEmissive * 0.6} toneMapped={false} />
      </mesh>
      
      {/* Bridge Top */}
      <mesh position={[-len * 0.15, 0.45, 0]}>
        <boxGeometry args={[len * 0.12, 0.08, wid * 0.3]} />
        <meshStandardMaterial color={deckColor} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Radar/Antenna on bridge */}
      {!sunk && (
        <mesh position={[-len * 0.15, 0.55, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={accentEmissive * 2} toneMapped={false} />
        </mesh>
      )}

      {/* Carrier-specific: Flight Deck */}
      {isCarrier && (
        <>
          <mesh position={[len * 0.1, 0.31, 0]}>
            <boxGeometry args={[len * 0.4, 0.02, wid * 0.75]} />
            <meshStandardMaterial color="#1a2535" metalness={0.5} roughness={0.6} />
          </mesh>
          {/* Aircraft markings */}
          {!sunk && Array.from({ length: 3 }).map((_, i) => (
            <mesh key={i} position={[len * 0.05 + i * 0.3, 0.33, 0]}>
              <boxGeometry args={[0.08, 0.01, 0.15]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={accentEmissive} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}

      {/* Battleship-specific: Main Gun Turrets */}
      {isBattleship && (
        Array.from({ length: 3 }).map((_, i) => {
          const t = (i + 0.5) / 3;
          const px = -len * 0.25 + t * (len * 0.5);
          return (
            <group key={`t${i}`} position={[px, 0.32, 0]}>
              <mesh>
                <cylinderGeometry args={[wid * 0.2, wid * 0.22, 0.12, 8]} />
                <meshStandardMaterial color={deckColor} metalness={0.8} roughness={0.3} />
              </mesh>
              {!sunk && (
                <>
                  <mesh position={[wid * 0.3, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.03, 0.03, wid * 0.6, 6]} />
                    <meshStandardMaterial color={hullColor} metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[wid * 0.35, 0.06, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, wid * 0.5, 6]} />
                    <meshStandardMaterial color={hullColor} metalness={0.9} roughness={0.2} />
                  </mesh>
                </>
              )}
            </group>
          );
        })
      )}

      {/* Submarine-specific: Conning Tower */}
      {isSubmarine && (
        <>
          <mesh position={[len * 0.1, 0.4, 0]}>
            <boxGeometry args={[len * 0.15, 0.18, wid * 0.3]} />
            <meshStandardMaterial color={deckColor} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[len * 0.1, 0.52, 0]}>
            <boxGeometry args={[len * 0.08, 0.08, wid * 0.2]} />
            <meshStandardMaterial color={deckColor} metalness={0.7} roughness={0.4} />
          </mesh>
          {!sunk && (
            <mesh position={[len * 0.1, 0.58, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={accentEmissive * 2} toneMapped={false} />
            </mesh>
          )}
        </>
      )}

      {/* Generic turrets for smaller ships */}
      {!isCarrier && !isBattleship && !isSubmarine && (
        Array.from({ length: turretCount }).map((_, i) => {
          const t = (i + 0.5) / turretCount;
          const px = -len * 0.25 + t * (len * 0.5);
          return (
            <group key={`t${i}`} position={[px, 0.3, 0]}>
              <mesh>
                <cylinderGeometry args={[wid * 0.15, wid * 0.17, 0.08, 8]} />
                <meshStandardMaterial color={deckColor} metalness={0.7} roughness={0.4} />
              </mesh>
              {!sunk && (
                <mesh position={[wid * 0.2, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.02, wid * 0.4, 6]} />
                  <meshStandardMaterial color={hullColor} metalness={0.8} roughness={0.3} />
                </mesh>
              )}
            </group>
          );
        })
      )}

      {/* Underwater shadow/outline */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len * 0.95, wid * 1.2]} />
        <meshBasicMaterial color={color} transparent opacity={sunk ? 0.08 : 0.15} />
      </mesh>
    </group>
  );
}

function HitMarker({ x, y, type, boardSize }: { x: number; y: number; type: "hit" | "miss"; boardSize: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state: any) => {
    if (ref.current && type === "hit") {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.08);
    }
  });
  if (type === "miss") {
    const [px, , pz] = gridPos(x, y, boardSize);
    return (
      <group position={[px, 0.06, pz]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.32, 32]} />
          <meshBasicMaterial color="#9fd8ee" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 24]} />
          <meshBasicMaterial color="#1a3340" transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }
  const [px, , pz] = gridPos(x, y, boardSize);
  return (
    <group position={[px, 0.45, pz]}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight color="#ff3b30" intensity={1.2} distance={2} />
    </group>
  );
}

function CellTile({
  x, y, hovered, previewState, shot, marked, onClick, onRightClick, onEnter, onLeave, isEnemy, boardSize,
}: {
  x: number; y: number;
  hovered: boolean;
  previewState: "none" | "valid" | "invalid";
  shot: "miss" | "hit" | undefined;
  marked: boolean;
  onClick: () => void; onRightClick: () => void; onEnter: () => void; onLeave: () => void;
  isEnemy: boolean;
  boardSize: number;
}) {
  const baseColor = isEnemy ? "#150a10" : "#08111c";
  const hoverColor = isEnemy ? "#ff3b30" : "#3ad8ff";
  const previewColor = previewState === "valid" ? "#3ad8ff" : "#ff3b30";
  const showPreview = previewState !== "none";

  let color = baseColor;
  let opacity = 0.7;
  if (showPreview) { color = previewColor; opacity = 0.55; }
  else if (hovered && !shot) { color = hoverColor; opacity = 0.55; }
  else if (marked) { color = "#ffd84a"; opacity = 0.4; }

  const [px, , pz] = gridPos(x, y, boardSize);

  return (
    <group>
      <mesh
        position={[px, 0.015, pz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onContextMenu={(e) => { e.stopPropagation(); (e as any).nativeEvent?.preventDefault?.(); onRightClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onEnter(); }}
        onPointerOut={() => onLeave()}
      >
        <planeGeometry args={[CELL * 0.94, CELL * 0.94]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {marked && !shot && (
        <group position={[px, 0.08, pz]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.22, 0.3, 4]} />
            <meshBasicMaterial color="#ffd84a" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.5, 0.06]} />
            <meshBasicMaterial color="#ffd84a" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <planeGeometry args={[0.5, 0.06]} />
            <meshBasicMaterial color="#ffd84a" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function WaterSurface({ boardSize, isEnemy }: { boardSize: number; isEnemy: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useRef({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(isEnemy ? "#0a1520" : "#051020") },
    uWaveHeight: { value: 0.08 },
    uWaveSpeed: { value: 0.5 },
  });

  useFrame((state: any) => {
    if (meshRef.current) {
      uniforms.current.uTime.value = state.clock.elapsedTime;
    }
  });

  const vertexShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    uniform float uWaveHeight;
    uniform float uWaveSpeed;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Create wave pattern
      float wave1 = sin(pos.x * 2.0 + uTime * uWaveSpeed) * uWaveHeight;
      float wave2 = sin(pos.z * 3.0 + uTime * uWaveSpeed * 1.3) * uWaveHeight * 0.7;
      float wave3 = cos(pos.x * 1.5 + pos.z * 1.5 + uTime * uWaveSpeed * 0.8) * uWaveHeight * 0.5;
      
      pos.y += wave1 + wave2 + wave3;
      vElevation = pos.y;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform vec3 uColor;

    void main() {
      // Create depth variation based on elevation
      float depthFactor = smoothstep(-0.15, 0.15, vElevation);
      vec3 deepColor = uColor * 0.6;
      vec3 shallowColor = uColor * 1.2;
      vec3 finalColor = mix(deepColor, shallowColor, depthFactor);
      
      // Add subtle shimmer
      float shimmer = sin(vUv.x * 50.0 + vElevation * 20.0) * 0.05;
      finalColor += shimmer;
      
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `;

  return (
    <mesh ref={meshRef} position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[boardSize + 2, boardSize + 2, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GridLines({ boardSize }: { boardSize: number }) {
  const lines = useMemo(() => {
    const pts: number[] = [];
    const half = (boardSize * CELL) / 2;
    for (let i = 0; i <= boardSize; i++) {
      const p = -half + i * CELL;
      pts.push(-half, 0.01, p, half, 0.01, p);
      pts.push(p, 0.01, -half, p, 0.01, half);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [boardSize]);
  return (
    <lineSegments>
      <primitive object={lines} attach="geometry" />
      <lineBasicMaterial color="#3ad8ff" transparent opacity={0.35} />
    </lineSegments>
  );
}

function makeLabel(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(58,216,255,0.95)";
  ctx.font = "bold 38px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 32, 34);
  return new THREE.CanvasTexture(canvas);
}

function AxisLabel({ position, text }: { position: [number, number, number]; text: string }) {
  const texture = useMemo(() => makeLabel(text), [text]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.48, 0.48]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function AxisLabels({ boardSize }: { boardSize: number }) {
  const half = (boardSize * CELL) / 2;
  const offset = half - CELL / 2;
  const edgeZ = half + 0.65;
  const edgeX = -(half + 0.65);
  return (
    <>
      {Array.from({ length: boardSize }, (_, i) => {
        const pos = i * CELL - offset;
        return (
          <group key={i}>
            <AxisLabel position={[pos, 0.05, edgeZ]} text={i.toString()} />
            <AxisLabel position={[edgeX, 0.05, pos]} text={String.fromCharCode(65 + i)} />
          </group>
        );
      })}
    </>
  );
}

function Scene({ board, isEnemy, revealShips, onCellClick, onCellRightClick, onCellHover, hoverPreview, boardSize = 10, playerColor }: BoardProps) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const isLight = typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const bgColor = isLight ? "#e8eef5" : "#05070d";
  const shipColor = playerColor ?? (isEnemy ? "#ff5b50" : "#3ad8ff");

  const previewSet = useMemo(() => {
    if (!hoverPreview) return null;
    return new Set(hoverPreview.cells.map((c) => cellKey(c.x, c.y)));
  }, [hoverPreview]);

  const sunkCells = useMemo(() => {
    const s = new Set<string>();
    for (const ship of board.ships) {
      if (ship.hits >= ship.size) {
        for (const c of shipCells(ship)) s.add(cellKey(c.x, c.y));
      }
    }
    return s;
  }, [board.ships]);

  // Camera distance scales with board size
  const camDist = boardSize * 0.9 + 6;
  const fogNear = boardSize * 1.2 + 4;
  const fogFar = boardSize * 2.8 + 10;

  const cells = [];
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const k = cellKey(x, y);
      const shot = board.shots[k];
      const isHover = hover?.x === x && hover?.y === y;
      const marked = !!board.marks?.[k];
      let preview: "none" | "valid" | "invalid" = "none";
      if (previewSet?.has(k)) preview = hoverPreview!.valid ? "valid" : "invalid";
      cells.push(
        <CellTile key={k} x={x} y={y}
          shot={shot}
          hovered={isHover}
          previewState={preview}
          marked={marked}
          isEnemy={isEnemy}
          boardSize={boardSize}
          onEnter={() => { setHover({ x, y }); onCellHover?.(x, y); }}
          onLeave={() => { setHover(null); onCellHover?.(x, null); }}
          onClick={() => onCellClick?.(x, y)}
          onRightClick={() => onCellRightClick?.(x, y)}
        />
      );
    }
  }

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, fogNear, fogFar]} />
      <ambientLight intensity={isLight ? 0.9 : 0.55} />
      <directionalLight position={[5, 10, 5]} intensity={isLight ? 1.3 : 1.1} />
      <pointLight position={[0, 4, 0]} intensity={1.2} color={isEnemy ? "#ff3b30" : "#3ad8ff"} />

      <group>
        <WaterSurface boardSize={boardSize} isEnemy={isEnemy} />
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[boardSize + 0.4, 0.05, boardSize + 0.4]} />
          <meshStandardMaterial color={isLight ? "#cfd8e3" : "#020406"} metalness={0.3} roughness={0.8} transparent opacity={0.8} />
        </mesh>
        <GridLines boardSize={boardSize} />
        <AxisLabels boardSize={boardSize} />
        {cells}
        {board.ships.map((s) => {
          const isSunk = s.hits >= s.size;
          if (revealShips || isSunk) {
            return (
              <group key={s.id}>
                <ShipMesh ship={s} color={shipColor} sunk={isSunk} boardSize={boardSize} />
                {isSunk && <DestroyedShipEffect ship={s} color={shipColor} boardSize={boardSize} />}
              </group>
            );
          }
          return null;
        })}
        {Object.entries(board.shots).map(([k, v]) => {
          if (v === "hit" && sunkCells.has(k)) return null;
          const [x, y] = k.split(",").map(Number);
          return <HitMarker key={k} x={x} y={y} type={v} boardSize={boardSize} />;
        })}
      </group>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.12}
        minDistance={camDist * 0.7}
        maxDistance={camDist * 1.6}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

export function GameBoard3D(props: BoardProps) {
  const boardSize = props.boardSize ?? 10;
  const camDist = boardSize * 0.9 + 6;
  return (
    <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        camera={{ position: [0, camDist * 0.85, camDist * 0.85], fov: 45 }}
        dpr={[1.5, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene {...props} boardSize={boardSize} />
      </Canvas>
    </div>
  );
}
