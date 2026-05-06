"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { updateUserPhotoAction } from "@/app/actions/user";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClientPhotoPicker({
  userId,
  defaultPhotoUrl,
  name,
}: {
  userId: string;
  defaultPhotoUrl?: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setEditingDataUrl(result);
    };
    reader.onerror = () => toast.error("No pudimos leer la imagen.");
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setEditingDataUrl(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", new File([blob], "user.jpg", { type: "image/jpeg" }));
      fd.set("userId", userId);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "No se pudo subir la imagen.");
      }
      try {
        await updateUserPhotoAction(userId, json.url);
      } catch {
        // API endpoint already persisted; action is for revalidation only.
      }
      setPhotoUrl(json.url);
      toast.success("Foto actualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: 88,
          height: 88,
          background: photoUrl
            ? "var(--color-surface-2, var(--color-surface))"
            : "linear-gradient(135deg, var(--color-brand), color-mix(in oklab, var(--color-brand) 60%, oklch(45% 0.12 38)))",
          boxShadow:
            "0 14px 32px color-mix(in oklab, var(--color-brand) 35%, transparent)",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-[28px] font-black">
            {initials(name)}
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-[13px] font-bold transition disabled:opacity-60"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-foreground)",
        }}
      >
        <Camera className="h-4 w-4" />
        {uploading ? "Subiendo..." : photoUrl ? "Cambiar foto" : "Agregar foto"}
      </button>

      {editingDataUrl && (
        <PhotoCropDialog
          imageSrc={editingDataUrl}
          onCancel={() => setEditingDataUrl(null)}
          onConfirm={handleCropDone}
        />
      )}
    </div>
  );
}
