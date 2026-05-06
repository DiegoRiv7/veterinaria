// Animated background — soft blobs + paw "trails" that walk across the screen.
// Each trail is N stamped paws with staggered delays, like an animal walked through.
import * as React from "react";

function PawSvg({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill={color}
      aria-hidden
      style={{ display: "block" }}
    >
      <ellipse cx="18" cy="20" rx="5.5" ry="7.5" transform="rotate(-15 18 20)" />
      <ellipse cx="46" cy="20" rx="5.5" ry="7.5" transform="rotate(15 46 20)" />
      <ellipse cx="9" cy="36" rx="4.5" ry="6.5" transform="rotate(-25 9 36)" />
      <ellipse cx="55" cy="36" rx="4.5" ry="6.5" transform="rotate(25 55 36)" />
      <path d="M32 30 C 22 30, 16 39, 16 47 C 16 55, 23 59, 32 59 C 41 59, 48 55, 48 47 C 48 39, 42 30, 32 30 Z" />
    </svg>
  );
}

// Vetsfriend palette — terracotta + mustard tones for the paw trails
const PALETTE = [
  "#d97a4a", // terracotta light
  "#ce5a2d", // terracotta brand
  "#e8a061", // peach
  "#e6b82d", // mustard
  "#f0c95e", // mustard light
  "#f4a472", // peach soft
  "#a8431a", // terracotta deep (accent only)
];

function rand(i: number, salt: number) {
  const x = Math.sin(i * 1300 + salt * 17) * 10000;
  return x - Math.floor(x);
}

type Trail = {
  id: number;
  x0: number;
  y0: number;
  angle: number;
  length: number;
  size: number;
  color: string;
  startDelay: number;
  duration: number;
};

// Grid-based distribution so paws cover the viewport evenly instead of
// clustering near the center. Each cell anchors one trail.
const COLS = 4;
const ROWS = 4;
const TRAIL_COUNT = COLS * ROWS;
const PAWS_PER_TRAIL = 5;

const TRAILS: Trail[] = Array.from({ length: TRAIL_COUNT }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cellW = 100 / COLS;
  const cellH = 100 / ROWS;

  // Anchor near cell center with a small random offset so it doesn't look mechanical.
  const jitterX = (rand(i, 1) - 0.5) * cellW * 0.5;
  const jitterY = (rand(i, 2) - 0.5) * cellH * 0.5;
  const x0 = col * cellW + cellW * 0.5 + jitterX;
  const y0 = row * cellH + cellH * 0.5 + jitterY;

  // Bias direction outward from viewport center so paws drift toward edges
  // instead of converging in the middle.
  const dx = x0 - 50;
  const dy = y0 - 50;
  const baseAngle = Math.atan2(dy || 0.01, dx || 0.01);
  const wobble = (rand(i, 3) - 0.5) * 1.0; // ±0.5 rad
  const angle = baseAngle + wobble;
  const length = 10 + rand(i, 4) * 6; // 10..16% — short trails stay inside cell

  const size = 14 + Math.floor(rand(i, 5) * 6); // 14..20px — smaller, softer
  const colorIdx = i % 5 === 4 ? 6 : i % 6;
  return {
    id: i,
    x0,
    y0,
    angle,
    length,
    size,
    color: PALETTE[colorIdx],
    startDelay: rand(i, 7) * 6, // randomize start so trails don't pulse in waves
    duration: 14, // longer cycle = calmer feel
  };
});

type Paw = {
  key: string;
  left: number;
  top: number;
  size: number;
  color: string;
  rotate: number;
  delay: number;
  duration: number;
  opacity: number;
};

const PAWS: Paw[] = TRAILS.flatMap((trail) => {
  return Array.from({ length: PAWS_PER_TRAIL }, (_, j) => {
    const t = j / (PAWS_PER_TRAIL - 1);
    const baseX = trail.x0 + Math.cos(trail.angle) * trail.length * t;
    const baseY = trail.y0 + Math.sin(trail.angle) * trail.length * t;
    // Alternate left/right footprint perpendicular to walk direction
    const side = j % 2 === 0 ? -1 : 1;
    const perpX = -Math.sin(trail.angle) * 1.4 * side;
    const perpY = Math.cos(trail.angle) * 1.4 * side;
    // Paw rotation: aim along walk direction (+90 because SVG points "up")
    // plus alternating tilt to mimic real footprints
    const rotateDeg =
      (trail.angle * 180) / Math.PI + 90 + side * 14 + (j === 0 ? -2 : 0);
    return {
      key: `${trail.id}-${j}`,
      left: baseX + perpX,
      top: baseY + perpY,
      size: trail.size,
      color: trail.color,
      rotate: rotateDeg,
      delay: trail.startDelay + j * 0.30,
      duration: trail.duration,
      opacity: 0.26 + (j % 3) * 0.04, // visible without being loud
    };
  });
});

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 13) % 90),
  top: 8 + ((i * 19) % 84),
  delay: rand(i, 9) * 2.5,
  duration: 2.5 + rand(i, 10) * 1.5,
  color: i % 2 === 0 ? "#f0c95e" : "#e8a061",
}));

export function BackgroundDecor() {
  return (
    <div className="bg-decor" aria-hidden>
      <div className="bg-blob b1" />
      <div className="bg-blob b2" />
      <div className="bg-blob b3" />
      <div className="bg-blob b4" />

      {SPARKS.map((s) => (
        <span
          key={`s${s.id}`}
          className="bg-spark"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            background: s.color,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {PAWS.map((p) => (
        <span
          key={p.key}
          className="bg-paw"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ["--r" as never]: `${p.rotate}deg`,
              ["--o" as never]: p.opacity,
            } as React.CSSProperties
          }
        >
          <PawSvg size={p.size} color={p.color} />
        </span>
      ))}
    </div>
  );
}
