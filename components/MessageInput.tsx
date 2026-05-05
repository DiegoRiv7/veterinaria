"use client";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { sendMessageAction } from "@/app/actions/messages";
import { cn } from "@/lib/utils";

export function MessageInput({ appointmentId }: { appointmentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={(fd) =>
        start(async () => {
          const body = String(fd.get("body") ?? "").trim();
          if (!body) return;
          try {
            await sendMessageAction(fd);
            formRef.current?.reset();
            inputRef.current?.focus();
            router.refresh();
          } catch (e) {
            toast.error("No se pudo enviar", {
              description: e instanceof Error ? e.message : "Intenta de nuevo.",
            });
          }
        })
      }
      className="flex items-end gap-2"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <textarea
        ref={inputRef}
        name="body"
        rows={1}
        placeholder="Escribe un mensaje..."
        className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "h-10 w-10 flex items-center justify-center rounded-full transition disabled:opacity-50",
          "[background-image:var(--chat-send-bg)] text-[color:var(--chat-send-text)] shadow-[var(--shadow-soft-sm)] hover:brightness-[1.03] active:scale-95"
        )}
        aria-label="Enviar"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
