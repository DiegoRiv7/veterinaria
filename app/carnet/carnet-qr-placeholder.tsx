"use client";

/**
 * Static QR-shaped SVG placeholder. We render a real scannable QR
 * (linking to /p/[petId]) once the public cartilla page exists.
 */
export function CarnetQrPlaceholder({ petId: _petId }: { petId: string }) {
  // Hand-crafted 21x21 grid pattern that *looks* like a QR but isn't
  // scannable. Replace with a real QR encoder later.
  const grid = [
    "1111111011010110111111",
    "1000001001101010000001",
    "1011101011010101110110",
    "1011101000101101110100",
    "1011101010110101110110",
    "1000001001001010000010",
    "1111111010101011111110",
    "0000000001010100000000",
    "1101011110110110101101",
    "0010100101001001010011",
    "1110011010100110011011",
    "0101100001011000110101",
    "1011011110100111011010",
    "0000000010110100000001",
    "1111111011010111110110",
    "1000001010100010000001",
    "1011101001101101110110",
    "1011101010110101110100",
    "1011101001001101110101",
    "1000001000101010000011",
    "1111111011010111111110",
  ];
  const size = 100;
  const cells = 21;
  const cell = size / cells;
  return (
    <div
      className="rounded-[10px] p-1.5 shrink-0"
      style={{
        background: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <svg
        width={size - 12}
        height={size - 12}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        <rect width={size} height={size} fill="white" />
        {grid.slice(0, cells).map((row, r) =>
          row
            .split("")
            .slice(0, cells)
            .map((bit, c) =>
              bit === "1" ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cell}
                  y={r * cell}
                  width={cell}
                  height={cell}
                  fill="#1a1035"
                />
              ) : null
            )
        )}
      </svg>
    </div>
  );
}
