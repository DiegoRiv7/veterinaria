"use client";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

const OUTPUT_SIZE = 800; // final square size in px

async function cropToBlob(imageSrc: string, area: Area, rotation: number): Promise<Blob> {
  const img = await loadImage(imageSrc);

  // First, render the rotated source to an offscreen canvas at full size
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotW = img.width * cos + img.height * sin;
  const rotH = img.width * sin + img.height * cos;

  const off = document.createElement("canvas");
  off.width = rotW;
  off.height = rotH;
  const ctx = off.getContext("2d");
  if (!ctx) throw new Error("Canvas no soportado");
  ctx.translate(rotW / 2, rotH / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  // Then crop the cropper-reported area from the rotated canvas
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas no soportado");
  octx.drawImage(
    off,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function PhotoCropDialog({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!areaPixels) return;
    setSaving(true);
    try {
      const blob = await cropToBlob(imageSrc, areaPixels, rotation);
      await onConfirm(blob);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-sm">
      <header className="flex items-center justify-between px-4 py-3 text-white">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[10px] hover:bg-white/10"
        >
          <X className="h-4 w-4" /> Cancelar
        </button>
        <p className="text-sm font-semibold">Ajusta la foto</p>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || !areaPixels}
        >
          {saving ? "Guardando..." : "Listo"}
        </Button>
      </header>

      <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 px-4 py-3">
        <div className="relative aspect-square w-full max-w-md max-h-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="rect"
            showGrid
            objectFit="horizontal-cover"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onComplete}
          />
        </div>
      </div>

      <footer className="px-5 py-4 bg-black/80 text-white flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <ZoomOut className="h-5 w-5 opacity-70" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#ce5a2d]"
            aria-label="Zoom"
          />
          <ZoomIn className="h-5 w-5 opacity-70" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-white/70">
            Arrastra para mover · Pellizca o usa la barra para acercar
          </p>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[10px] bg-white/10 hover:bg-white/20"
            aria-label="Rotar 90°"
          >
            <RotateCw className="h-4 w-4" /> Rotar
          </button>
        </div>
      </footer>
    </div>
  );
}
