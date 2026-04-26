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
      })),
    }))
  );
}
