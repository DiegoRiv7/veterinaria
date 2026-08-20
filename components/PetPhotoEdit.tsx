"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

/**
 * Foto de la mascota clickeable: al darle clic se elige una imagen nueva y
 * se guarda al instante (la usa el personal desde el expediente/cartilla).
 * Muestra un overlay con cámara al pasar el mouse y un badge permanente
 * para que se descubra también en pantallas táctiles.
 */
export function PetPhotoEdit({
  petId,
  photoUrl,
  alt,
  fallback,
  className,
  style,
}: {
  petId: string;
  photoUrl: string | null;
  alt: string;
  /** Qué mostrar cuando no hay foto (emoji). */
  fallback: React.ReactNode;
  /** Clases del contenedor: tamaño, borde, redondeo… */
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen supera el límite de 2MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("petId", petId);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "No se pudo subir la foto.");
      }
      toast.success("Foto actualizada.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo subir la foto."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      aria-label={`Cambiar foto de ${alt}`}
      title="Cambiar foto"
      className={`relative group cursor-pointer ${className ?? ""}`}
      style={style}
    >
      <span className="absolute inset-0 overflow-hidden rounded-[inherit] flex items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={alt} className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
        {/* Overlay al pasar el mouse / mientras sube */}
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/45 text-white transition-opacity ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </span>
      {/* Badge permanente (descubrible sin hover) */}
      <span
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border"
        style={{
          background: "#fff",
          borderColor: "rgba(0,0,0,0.08)",
          color: "#8a6a55",
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}
      >
        <Camera className="h-3.5 w-3.5" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFile}
      />
    </button>
  );
}
