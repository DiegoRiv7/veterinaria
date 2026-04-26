"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { VetAvatar } from "@/components/VetAvatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { updateVetPhotoAction } from "@/app/actions/vet";

export function VetPhotoPicker({
  vetId,
  defaultPhotoUrl,
  name,
}: {
  vetId: string;
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
      fd.set("file", new File([blob], "vet.jpg", { type: "image/jpeg" }));
      fd.set("vetId", vetId);
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
      try {
        await updateVetPhotoAction(vetId, json.url);
      } catch {
        // Ignore: API endpoint already persisted the photo. Action is mainly for revalidation.
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
      <div className="relative">
        <VetAvatar size="xl" photoUrl={photoUrl} name={name} />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
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
