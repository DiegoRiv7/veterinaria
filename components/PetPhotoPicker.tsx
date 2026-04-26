"use client";
import { useRef, useState } from "react";
import { PetAvatar } from "@/components/PetAvatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";

export function PetPhotoPicker({
  name = "photoUrl",
  defaultPhotoUrl,
  petId,
  species = "OTHER",
  petName,
}: {
  name?: string;
  defaultPhotoUrl?: string | null;
  petId?: string;
  species?: string;
  petName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setEditingDataUrl(result);
    };
    reader.onerror = () => setError("No pudimos leer la imagen.");
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setEditingDataUrl(null);
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", new File([blob], "pet.jpg", { type: "image/jpeg" }));
      if (petId) fd.set("petId", petId);
      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "No se pudo subir la imagen.");
      }
      setPhotoUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <PetAvatar size="xl" photoUrl={photoUrl} species={species} name={petName} />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/40 text-white">
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
      <input type="hidden" name={name} value={photoUrl ?? ""} />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openPicker}
        disabled={uploading}
      >
        <Camera className="h-4 w-4" />
        {uploading ? "Subiendo..." : photoUrl ? "Cambiar foto" : "Agregar foto"}
      </Button>

      {error && (
        <p className="text-[12px] text-[var(--color-danger)] text-center">{error}</p>
      )}

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
