"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, X, ZoomIn } from "lucide-react";

/**
 * Foto de la mascota en el expediente/cartilla:
 * - Clic en la foto → se abre en grande (visor) para verla completa.
 * - Clic en el badge de cámara → adjuntar una foto nueva (se guarda al
 *   instante). Si aún no hay foto, el clic principal también abre el
 *   selector de archivo.
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
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!preview) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  function pickFile() {
    if (!uploading) inputRef.current?.click();
  }

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
      setPreview(false);
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
    <div className={`relative ${className ?? ""}`} style={style}>
      {/* Área principal: ver la foto en grande (o adjuntar si no hay). */}
      <button
        type="button"
        onClick={() => (photoUrl ? setPreview(true) : pickFile())}
        aria-label={photoUrl ? `Ver foto de ${alt}` : `Agregar foto de ${alt}`}
        title={photoUrl ? "Ver foto completa" : "Agregar foto"}
        className="absolute inset-0 overflow-hidden rounded-[inherit] flex items-center justify-center group cursor-pointer w-full h-full"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={alt} className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : photoUrl ? (
            <ZoomIn className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      {/* Badge de cámara: adjuntar foto nueva. */}
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        aria-label={`Cambiar foto de ${alt}`}
        title="Cambiar foto"
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border cursor-pointer transition hover:scale-110 disabled:cursor-not-allowed"
        style={{
          background: "#fff",
          borderColor: "rgba(0,0,0,0.08)",
          color: "#8a6a55",
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFile}
      />

      {/* Visor de foto completa */}
      {preview && photoUrl && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-5"
            style={{ background: "rgba(15, 10, 6, 0.78)", backdropFilter: "blur(4px)" }}
            onClick={() => setPreview(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Foto de ${alt}`}
          >
            <div
              className="relative flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={alt}
                className="max-w-[92vw] max-h-[78vh] object-contain rounded-[18px]"
                style={{ boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }}
              />
              <div className="flex items-center gap-2">
                <span className="text-white/90 text-[14px] font-extrabold mr-1">
                  {alt}
                </span>
                <button
                  type="button"
                  onClick={pickFile}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-extrabold transition hover:brightness-110 disabled:opacity-60"
                  style={{ background: "#fff", color: "#3a2a1e" }}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  Cambiar foto
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPreview(false)}
              aria-label="Cerrar"
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition hover:bg-white/15"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
