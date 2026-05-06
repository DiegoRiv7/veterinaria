import { NextRequest, NextResponse } from "next/server";
import { availableSlotsForDay } from "@/lib/scheduling";
import { readSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const dateStr = req.nextUrl.searchParams.get("date");
  const durationStr = req.nextUrl.searchParams.get("duration");
  if (!dateStr || !durationStr) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }
  const date = new Date(dateStr);
  const duration = Number(durationStr);
  if (Number.isNaN(date.getTime()) || !Number.isFinite(duration)) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }

  const data = await availableSlotsForDay(date, duration);
  return NextResponse.json(
    data.map((v) => ({
      vetId: v.vetId,
      vetName: v.vetName,
      bio: v.bio,
      photoUrl: v.photoUrl,
      slots: v.slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        display: formatSlotTime(s.start),
      })),
    }))
  );
}

// Server-side formatter — guarantees the AM/PM marker is correct on any
// device. Mirrors lib/utils.ts formatTime but uses the slot's intended
// LOCAL clock hour (the slot was built from open-minute-of-day, so the
// hour we want is just the hour component of the original Date).
function formatSlotTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "p.m." : "a.m.";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}
