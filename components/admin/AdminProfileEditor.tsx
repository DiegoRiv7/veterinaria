"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/app/actions/auth";
import {
  changeVetPasswordAction,
  updateVetAccountAction,
} from "@/app/actions/vet";
import { updateUserPhotoAction } from "@/app/actions/user";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  createdAt: string;
};

const fieldClass =
  "w-full h-12 px-4 rounded-[12px] border outline-none text-[15px] font-semibold focus:[border-color:var(--vet-green)] transition-colors disabled:opacity-60";
const fieldStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
const labelClass =
  "block text-[12px] font-extrabold uppercase tracking-wider mb-1.5";
const labelStyle = { color: "var(--vet-text-3)" } as const;
const sectionStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  borderRadius: 22,
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminProfileEditor({ user }: { user: UserData }) {
  return (
    <div className="flex flex-col gap-5 max-w-[760px] mx-auto w-full">
      <h1
        className="text-[24px] font-black tracking-tight"
        style={{ color: "var(--vet-text-1)" }}
      >
        Mi perfil
      </h1>

      <PhotoSection user={user} />
      <AccountSection user={user} />
      <PasswordSection />

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full h-12 rounded-[14px] text-[15px] font-extrabold border transition-colors"
          style={{
            background: "oklch(60% 0.20 20 / 0.10)",
            borderColor: "oklch(60% 0.20 20 / 0.30)",
            color: "var(--vet-red)",
          }}
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function PhotoSection({ user }: { user: UserData }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);

  function openPicker() {
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
      fd.set("file", new File([blob], "admin.jpg", { type: "image/jpeg" }));
      fd.set("userId", user.id);
      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url)
        throw new Error(json.error ?? "No se pudo subir la imagen.");
      try {
        await updateUserPhotoAction(user.id, json.url);
      } catch {
        // ignore
      }
      setPhotoUrl(json.url);
      toast.success("Foto actualizada.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo subir la imagen."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section
      className="border p-5 sm:p-6 flex flex-col items-center gap-4"
      style={sectionStyle}
    >
      <div className="w-full flex items-center justify-between">
        <h2
          className="text-[14px] font-extrabold uppercase tracking-wider"
          style={labelStyle}
        >
          Mi foto
        </h2>
      </div>
      <div
        className="relative rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: 96,
          height: 96,
          background: photoUrl
            ? "var(--vet-bg-mid)"
            : "linear-gradient(135deg, var(--vet-violet), oklch(38% 0.18 280))",
          boxShadow: "0 12px 28px color-mix(in oklab, var(--vet-violet) 30%, transparent)",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-[28px] font-black">
            {initials(user.name)}
          </span>
        )}
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
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-[12px] border text-[13px] font-bold transition-colors disabled:opacity-60"
        style={{
          background: "var(--vet-bg-mid)",
          borderColor: "var(--vet-border)",
          color: "var(--vet-text-1)",
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
    </section>
  );
}

function AccountSection({ user }: { user: UserData }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateVetAccountAction, {
    ok: undefined,
  } as never);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Perfil actualizado.");
      router.refresh();
    } else if (state?.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const createdYear = new Date(user.createdAt).getFullYear();

  return (
    <section className="border p-5 sm:p-6" style={sectionStyle}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[14px] font-extrabold uppercase tracking-wider"
          style={labelStyle}
        >
          Cuenta
        </h2>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold"
          style={{
            background:
              "color-mix(in oklab, var(--vet-violet) 14%, transparent)",
            color: "var(--vet-violet)",
          }}
        >
          Administrador · desde {createdYear}
        </span>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="adm-name" className={labelClass} style={labelStyle}>
            Nombre
          </label>
          <input
            id="adm-name"
            name="name"
            defaultValue={user.name}
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="adm-email"
              className={labelClass}
              style={labelStyle}
            >
              Correo (acceso)
            </label>
            <input
              id="adm-email"
              name="email"
              type="email"
              defaultValue={user.email}
              required
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
          <div>
            <label
              htmlFor="adm-phone"
              className={labelClass}
              style={labelStyle}
            >
              Teléfono
            </label>
            <input
              id="adm-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              defaultValue={user.phone}
              required
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
        </div>
        <input type="hidden" name="bio" value="" />
        <button
          type="submit"
          disabled={pending}
          className="self-start h-12 px-6 rounded-[14px] text-[15px] font-extrabold text-white transition-all disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 8px 24px var(--vet-green-glow)",
          }}
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [state, formAction, pending] = useActionState(changeVetPasswordAction, {
    ok: undefined,
  } as never);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Contraseña actualizada.");
      formRef.current?.reset();
    } else if (state?.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <section className="border p-5 sm:p-6" style={sectionStyle}>
      <h2
        className="text-[14px] font-extrabold uppercase tracking-wider mb-1"
        style={labelStyle}
      >
        Seguridad
      </h2>
      <p
        className="text-[13px] font-semibold mb-4"
        style={{ color: "var(--vet-text-3)" }}
      >
        Cambia tu contraseña periódicamente.
      </p>
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="adm-current"
            className={labelClass}
            style={labelStyle}
          >
            Contraseña actual
          </label>
          <input
            id="adm-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="adm-new"
              className={labelClass}
              style={labelStyle}
            >
              Nueva contraseña
            </label>
            <input
              id="adm-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
          <div>
            <label
              htmlFor="adm-confirm"
              className={labelClass}
              style={labelStyle}
            >
              Confirmar
            </label>
            <input
              id="adm-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
              style={fieldStyle}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="self-start h-12 px-6 rounded-[14px] text-[15px] font-extrabold border transition-colors disabled:opacity-60"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-1)",
          }}
        >
          {pending ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}
