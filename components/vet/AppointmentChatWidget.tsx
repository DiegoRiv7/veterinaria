"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { AppointmentChat } from "@/components/AppointmentChat";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string; role: string; photoUrl?: string | null };
  vetPhotoUrl?: string | null;
};

type WindowBox = { x: number; y: number; width: number; height: number };
type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_W = 360;
const MIN_H = 420;

export function AppointmentChatWidget({
  messages,
  currentUserId,
  appointmentId,
}: {
  messages: ChatMessage[];
  currentUserId: string;
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<WindowBox>({ x: 0, y: 0, width: 430, height: 620 });
  const initialized = useRef(false);

  function openWindow() {
    if (!initialized.current && typeof window !== "undefined") {
      const width = Math.min(430, window.innerWidth - 32);
      const height = Math.min(620, window.innerHeight - 32);
      setBox({
        width,
        height,
        x: Math.max(16, window.innerWidth - width - 16),
        y: Math.max(16, window.innerHeight - height - 16),
      });
      initialized.current = true;
    }
    setOpen(true);
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = box;
    e.currentTarget.setPointerCapture(e.pointerId);

    function move(ev: PointerEvent) {
      setBox((current) =>
        clampBox({
          ...current,
          x: startBox.x + ev.clientX - startX,
          y: startBox.y + ev.clientY - startY,
        }),
      );
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  function startResize(edge: ResizeEdge, e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = box;
    e.currentTarget.setPointerCapture(e.pointerId);

    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next = { ...startBox };

      if (edge.includes("e")) next.width = startBox.width + dx;
      if (edge.includes("s")) next.height = startBox.height + dy;
      if (edge.includes("w")) {
        next.x = startBox.x + dx;
        next.width = startBox.width - dx;
      }
      if (edge.includes("n")) {
        next.y = startBox.y + dy;
        next.height = startBox.height - dy;
      }

      setBox(clampBox(next));
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  return (
    <>
      <button
        type="button"
        onClick={openWindow}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-extrabold transition hover:brightness-105"
        style={{
          background: "color-mix(in oklab, var(--vet-green) 10%, transparent)",
          borderColor: "color-mix(in oklab, var(--vet-green) 26%, var(--vet-border))",
          color: "var(--vet-green)",
        }}
      >
        <MessageCircle className="h-4 w-4" />
        Ver conversación
      </button>

      {/* Portal al body: evita que cualquier stacking context del layout
          deje la ventana por debajo de los campos del formulario. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
        <div className="fixed inset-0 z-[80] pointer-events-none">
          <section
            className="pointer-events-auto fixed flex min-h-[360px] min-w-[320px] flex-col overflow-hidden rounded-[18px] border shadow-[0_22px_70px_rgba(0,0,0,.22)]"
            style={{
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
            }}
          >
            <div
              onPointerDown={startDrag}
              className="flex cursor-move select-none items-center justify-between gap-3 border-b px-4 py-3"
              style={{
                borderColor: "var(--vet-border)",
                background: "var(--vet-bg-mid)",
              }}
            >
              <div className="min-w-0">
                <p
                  className="text-[14px] font-black leading-tight"
                  style={{ color: "var(--vet-text-1)" }}
                >
                  Conversación de la cita
                </p>
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--vet-text-3)" }}
                >
                  {messages.length} mensaje{messages.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Cerrar conversación"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition hover:brightness-105"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <AppointmentChat
                messages={messages}
                currentUserId={currentUserId}
                appointmentId={appointmentId}
              />
            </div>

            {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[]).map(
              (edge) => (
                <ResizeHandle
                  key={edge}
                  edge={edge}
                  onPointerDown={(e) => startResize(edge, e)}
                />
              ),
            )}
          </section>
        </div>,
        document.body
      )}
    </>
  );
}

function ResizeHandle({
  edge,
  onPointerDown,
}: {
  edge: ResizeEdge;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const classByEdge: Record<ResizeEdge, string> = {
    n: "left-4 right-4 top-0 h-2 cursor-ns-resize",
    s: "bottom-0 left-4 right-4 h-2 cursor-ns-resize",
    e: "bottom-4 right-0 top-4 w-2 cursor-ew-resize",
    w: "bottom-4 left-0 top-4 w-2 cursor-ew-resize",
    ne: "right-0 top-0 h-4 w-4 cursor-nesw-resize",
    nw: "left-0 top-0 h-4 w-4 cursor-nwse-resize",
    se: "bottom-0 right-0 h-4 w-4 cursor-nwse-resize",
    sw: "bottom-0 left-0 h-4 w-4 cursor-nesw-resize",
  };

  return (
    <button
      type="button"
      aria-label={`Redimensionar ${edge}`}
      onPointerDown={onPointerDown}
      className={`absolute ${classByEdge[edge]}`}
    />
  );
}

function clampBox(box: WindowBox): WindowBox {
  if (typeof window === "undefined") return box;
  const padding = 12;
  const maxW = Math.max(MIN_W, window.innerWidth - padding * 2);
  const maxH = Math.max(MIN_H, window.innerHeight - padding * 2);
  const width = Math.min(Math.max(box.width, Math.min(MIN_W, maxW)), maxW);
  const height = Math.min(Math.max(box.height, Math.min(MIN_H, maxH)), maxH);
  const x = Math.min(Math.max(box.x, padding), window.innerWidth - width - padding);
  const y = Math.min(Math.max(box.y, padding), window.innerHeight - height - padding);
  return { x, y, width, height };
}
