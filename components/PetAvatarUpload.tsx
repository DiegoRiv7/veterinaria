"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { SPECIES_EMOJI } from "@/lib/utils";

/**
 * Round, tappable pet avatar that lets the owner upload a photo right
 * from the pet detail header. Opens the file picker on tap; runs the
 * crop dialog; uploads to /api/upload-photo with the petId.
 */
export function PetAvatarUpload({
  petId,
  defaultPhotoUrl,
  species,
  petName,
  ringColor,
  size = 70,
  emojiSize = 36,
}: {
  petId: string;
  defaultPhotoUrl?: string | null;
  species: string;
  petName: string;
  ringColor: string;
  size?: number;
  emojiSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);

  function openPicker() {
    if (uploading) return;
    inputRef.current?.click();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
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
      fd.set("file", new File([blob], "pet.jpg", { type: "image/jpeg" }));
      fd.set("petId", petId);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "No se pudo subir la imagen.");
      }
      setPhotoUrl(json.url);
      toast.success("Foto actualizada.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label={photoUrl ? `Cambiar foto de ${petName}` : `Agregar foto de ${petName}`}
        className="relative shrink-0 group"
        style={{ width: size, height: size }}
      >
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{
            width: size,
            height: size,
            background: photoUrl ? "transparent" : `${ringColor}28`,
            border: `3px solid ${ringColor}55`,
            fontSize: emojiSize,
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={petName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{SPECIES_EMOJI[species] || "🐾"}</span>
          )}
        </div>

        {/* Camera badge */}
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-md transition group-hover:scale-105"
          style={{
            width: 28,
            height: 28,
            background: "var(--color-brand)",
            border: "2px solid var(--color-surface)",
            color: "white",
          }}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </span>

        {uploading && (
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 text-white"
            style={{ width: size, height: size }}
          />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelect}
      />

      {editingDataUrl && (
        <PhotoCropDialog
          imageSrc={editingDataUrl}
          onCancel={() => setEditingDataUrl(null)}
          onConfirm={handleCropDone}
        />
      )}
    </>
  );
}
