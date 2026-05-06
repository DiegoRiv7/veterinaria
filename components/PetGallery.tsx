"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { deletePetPhotoAction } from "@/app/actions/appointments";

type Photo = { id: string; url: string };

export function PetGallery({
  petId,
  petName,
  initialPhotos,
}: {
  petId: string;
  petName: string;
  initialPhotos: Photo[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, startDelete] = useTransition();
  const [viewer, setViewer] = useState<Photo | null>(null);

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
      fd.set("file", new File([blob], "pet-gallery.jpg", { type: "image/jpeg" }));
      fd.set("petId", petId);
      fd.set("gallery", "1");
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        photoId?: string;
        error?: string;
      };
      if (!res.ok || !json.url || !json.photoId) {
        throw new Error(json.error ?? "No se pudo subir la imagen.");
      }
      setPhotos((prev) => [{ id: json.photoId!, url: json.url! }, ...prev]);
      toast.success("Foto agregada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(photoId: string) {
    if (!confirm("¿Quitar esta foto?")) return;
    startDelete(async () => {
      try {
        await deletePetPhotoAction(photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (viewer?.id === photoId) setViewer(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2
          className="text-[14px] font-extrabold uppercase tracking-wide"
          style={{ color: "var(--color-muted)" }}
        >
          Galería
        </h2>
        <span
          className="text-[11px] font-bold"
          style={{ color: "var(--color-muted)" }}
        >
          {photos.length} {photos.length === 1 ? "foto" : "fotos"}
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {/* Add tile */}
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-[16px] transition disabled:opacity-60"
          style={{
            width: 92,
            height: 92,
            background: "color-mix(in oklab, var(--color-brand) 8%, transparent)",
            border: "1.5px dashed var(--color-brand)",
            color: "var(--color-brand)",
          }}
          aria-label={`Agregar foto de ${petName}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span className="text-[11px] font-extrabold">Agregar</span>
            </>
          )}
        </button>

        {/* Photos */}
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative flex-shrink-0 rounded-[16px] overflow-hidden"
            style={{
              width: 92,
              height: 92,
              background: "var(--color-surface-2, var(--color-surface))",
              border: "1.5px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewer(p)}
              className="block w-full h-full"
              aria-label={`Ver foto de ${petName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={petName}
                className="w-full h-full object-cover"
              />
            </button>
            <button
              type="button"
              onClick={() => removePhoto(p.id)}
              disabled={pendingDelete}
              className="absolute top-1 right-1 rounded-full flex items-center justify-center shadow-md transition disabled:opacity-60"
              style={{
                width: 22,
                height: 22,
                background: "rgba(0,0,0,0.55)",
                color: "white",
              }}
              aria-label="Quitar foto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Empty hint inline */}
        {photos.length === 0 && (
          <div
            className="flex-1 min-w-0 flex items-center px-3"
            style={{ minHeight: 92 }}
          >
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: "var(--color-muted)" }}
            >
              Sube fotos de {petName} para recordarlas en la nube. Solo tú las
              ves.
            </p>
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

      {editingDataUrl && (
        <PhotoCropDialog
          imageSrc={editingDataUrl}
          onCancel={() => setEditingDataUrl(null)}
          onConfirm={handleCropDone}
        />
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewer.url}
            alt={petName}
            className="max-w-full max-h-full rounded-[16px]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setViewer(null)}
            className="absolute top-4 right-4 rounded-full flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: "rgba(255,255,255,0.18)",
              color: "white",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}
