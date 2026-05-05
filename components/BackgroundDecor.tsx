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

const TRAIL_COUNT = 6;
const PAWS_PER_TRAIL = 6;

const TRAILS: Trail[] = Array.from({ length: TRAIL_COUNT }, (_, i) => {
  const x0 = 8 + rand(i, 1) * 75;
  const y0 = 8 + rand(i, 2) * 78;
  const angle = rand(i, 3) * Math.PI * 2;
  const length = 22 + rand(i, 4) * 30; // 22..52% of viewport
  const size = 16 + Math.floor(rand(i, 5) * 10); // 16..26px
  // Bias palette: 6 of 7 picks land on blue/violet, 1 on pink accent
  const colorIdx = i === 2 ? 6 : i % 6;
  return {
    id: i,
    x0,
    y0,
    angle,
    length,
    size,
    color: PALETTE[colorIdx],
    startDelay: i * 2.4, // stagger so trails appear at different times
    duration: 16, // total cycle: stamps + hold + fade + pause
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
      delay: trail.startDelay + j * 0.32,
      duration: trail.duration,
      opacity: 0.36 + (j % 3) * 0.04,
    };
  });
});

const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 13) % 90),
  top: 8 + ((i * 19) % 84),
  delay: rand(i, 9) * 4,
  duration: 3.5 + rand(i, 10) * 2,
  color: i % 2 === 0 ? "#a5d8ff" : "#c4b5fd",
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
