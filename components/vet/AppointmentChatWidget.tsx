"use client";

import { useState } from "react";
import { Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import { AppointmentChat } from "@/components/AppointmentChat";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { name: string; role: string; photoUrl?: string | null };
  vetPhotoUrl?: string | null;
};

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
  const [large, setLarge] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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

      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className={`pointer-events-auto fixed bottom-4 right-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[18px] border shadow-[0_22px_70px_rgba(0,0,0,.22)] ${
              large
                ? "left-4 top-4 sm:left-auto sm:top-auto sm:w-[720px]"
                : "left-4 sm:left-auto sm:w-[420px]"
            }`}
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b px-4 py-3"
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLarge((prev) => !prev)}
                  aria-label={large ? "Hacer más pequeña" : "Hacer más grande"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition hover:brightness-105"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-2)",
                  }}
                >
                  {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar conversación"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition hover:brightness-105"
                  style={{
                    background: "var(--vet-bg-card)",
                    borderColor: "var(--vet-border)",
                    color: "var(--vet-text-2)",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto p-3">
              <AppointmentChat
                messages={messages}
                currentUserId={currentUserId}
                appointmentId={appointmentId}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
