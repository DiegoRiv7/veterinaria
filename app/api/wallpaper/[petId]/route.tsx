import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import {
  paletteForStyle,
  isTransparentStyle,
  bgEmojisFor,
  parsePersonalityTags,
  personalityFor,
  funFactFor,
  moodFor,
} from "@/lib/pet-flavor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMATS = {
  mobile: { width: 1170, height: 2532, layout: "portrait" as const },
  desktop: { width: 1920, height: 1080, layout: "landscape" as const },
  square: { width: 1080, height: 1080, layout: "square" as const },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  const { petId } = await params;
  const formatParam =
    (req.nextUrl.searchParams.get("format") as keyof typeof FORMATS) ?? "mobile";
  const fmt = FORMATS[formatParam] ?? FORMATS.mobile;

  // Auth: only owner or admin can fetch the wallpaper.
  const session = await readSession();
  if (!session) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    include: { vaccines: { select: { nextAt: true } } },
  });
  if (!pet) return new Response("NOT_FOUND", { status: 404 });
  if (pet.ownerId !== session.userId && session.role !== "ADMIN") {
    return new Response("FORBIDDEN", { status: 403 });
  }

  const palette = paletteForStyle(pet);
  const transparent = isTransparentStyle(pet.cardStyle);
  const tags =
    parsePersonalityTags(pet.personalityTags) ?? personalityFor(pet.species);
  const mood =
    pet.customMood ??
    moodFor({
      species: pet.species,
      hasUpcoming: false,
      hasPendingVaccine: pet.vaccines.some(
        (v) => v.nextAt && v.nextAt.getTime() < Date.now()
      ),
    });
  const funFact = pet.customFunFact ?? funFactFor(pet);
  const bgEmoji = bgEmojisFor(pet.species)[0];

  // Resolve a usable photo source for ImageResponse. Data URLs work, but
  // need to be passed as <img src>; absolute URLs work too.
  const photoSrc = pet.photoUrl;

  const isPortrait = fmt.layout === "portrait";
  const isLandscape = fmt.layout === "landscape";

  // Color stack — when the user picked a color we use it; otherwise we
  // use the palette gradient.
  const baseGradient = `linear-gradient(150deg, ${palette.from}, ${palette.to})`;

  return new ImageResponse(
    (
      <div
        style={{
          width: fmt.width,
          height: fmt.height,
          display: "flex",
          flexDirection: "column",
          background: transparent ? "#1a1410" : baseGradient,
          color: "white",
          fontFamily: "system-ui",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Photo full-bleed */}
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={photoSrc}
            width={fmt.width}
            height={fmt.height}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: transparent ? 1 : 0.55,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isPortrait ? 720 : 520,
              opacity: 0.18,
            }}
          >
            {bgEmoji}
          </div>
        )}

        {/* Bottom darkening for legibility */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78) 100%)",
          }}
        />

        {/* Brand strip top */}
        <div
          style={{
            position: "absolute",
            top: isPortrait ? 80 : 50,
            left: isPortrait ? 80 : 60,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: isPortrait ? 64 : 50,
              height: isPortrait ? 64 : 50,
              borderRadius: 16,
              background: palette.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isPortrait ? 36 : 28,
            }}
          >
            🐾
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: isPortrait ? 32 : 24,
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              Vetsfriend
            </span>
            <span
              style={{
                fontSize: isPortrait ? 16 : 12,
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              Clínica & Grooming
            </span>
          </div>
        </div>

        {/* Bottom info — name + mood + tags */}
        <div
          style={{
            position: "absolute",
            bottom: isPortrait ? 140 : 70,
            left: isPortrait ? 80 : 80,
            right: isPortrait ? 80 : 80,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: isLandscape ? "60%" : "auto",
          }}
        >
          {/* Personality tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: isPortrait ? "8px 18px" : "6px 14px",
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 999,
                    fontSize: isPortrait ? 22 : 18,
                    fontWeight: 800,
                    color: "white",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Pet name */}
          <span
            style={{
              fontSize: isPortrait ? 220 : isLandscape ? 180 : 200,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-6px",
              lineHeight: 0.95,
              textShadow: "0 4px 30px rgba(0,0,0,0.4)",
              display: "flex",
            }}
          >
            {pet.name}
          </span>

          {/* Mood */}
          <span
            style={{
              fontSize: isPortrait ? 38 : 28,
              fontWeight: 700,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.92)",
              maxWidth: isPortrait ? 950 : 900,
              display: "flex",
            }}
          >
            {mood}
          </span>

          {/* Fun fact (only on portrait + square — desktop has less room) */}
          {!isLandscape && funFact && (
            <span
              style={{
                fontSize: isPortrait ? 26 : 22,
                fontWeight: 600,
                color: "rgba(255,255,255,0.78)",
                maxWidth: isPortrait ? 950 : 900,
                display: "flex",
                lineHeight: 1.4,
              }}
            >
              “{funFact}”
            </span>
          )}
        </div>

        {/* Color strip bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isPortrait ? 12 : 8,
            background: `linear-gradient(90deg, ${palette.from}, ${palette.accent}, ${palette.to})`,
          }}
        />
      </div>
    ),
    {
      width: fmt.width,
      height: fmt.height,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
