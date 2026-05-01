"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import {
  changeVetPasswordAction,
  updateVetAccountAction,
  updateVetPhotoAction,
} from "@/app/actions/vet";
import { VetAvatar } from "@/components/VetAvatar";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { VetIcon } from "@/components/vet/VetIcon";

type UserData = {
  name: string;
  email: string;
  phone: string;
  roleLabel: string;
};

type VetData = {
  id: string;
  bio: string | null;
  photoUrl: string | null;
};

type Props = {
  user: UserData;
  vet: VetData | null;
};

const fieldClass =
  "w-full h-12 px-4 rounded-[12px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors disabled:opacity-60";
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

export function VetProfileEditor({ user, vet }: Props) {
  return (
    <div className="flex flex-col gap-5 max-w-[760px] mx-auto w-full">
      <h1
        className="text-[24px] font-black tracking-tight"
        style={{ color: "var(--vet-text-1)" }}
      >
        Mi perfil
      </h1>

      {vet && (
        <PhotoSection vetId={vet.id} defaultPhotoUrl={vet.photoUrl} name={user.name} />
      )}

      <AccountSection user={user} bio={vet?.bio ?? ""} hasVetProfile={!!vet} />

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

/* ─── Photo ─────────────────────────────────────────────── */

function PhotoSection({
  vetId,
  defaultPhotoUrl,
  name,
}: {
  vetId: string;
  defaultPhotoUrl: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [editingDataUrl, setEditingDataUrl] = useState<string | null>(null);
  const router = useRouter();

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
      fd.set("file", new File([blob], "vet.jpg", { type: "image/jpeg" }));
      fd.set("vetId", vetId);
      const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo subir la imagen.");
      try {
        await updateVetPhotoAction(vetId, json.url);
      } catch {
        // Endpoint already persisted; action is mainly for revalidation.
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
    <section
      className="border p-5 sm:p-6 flex flex-col items-center gap-4"
      style={sectionStyle}
    >
      <div className="w-full flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider" style={labelStyle}>
          Mi foto
        </h2>
      </div>
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

/* ─── Account ───────────────────────────────────────────── */

function AccountSection({
  user,
  bio,
  hasVetProfile,
}: {
  user: UserData;
  bio: string;
  hasVetProfile: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateVetAccountAction, {
    ok: undefined,
  } as never);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success("Perfil actualizado.");
      router.refresh();
    } else if (state?.ok === false && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <section className="border p-5 sm:p-6" style={sectionStyle}>
      <h2 className="text-[14px] font-extrabold uppercase tracking-wider mb-4" style={labelStyle}>
        Cuenta
      </h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className={labelClass} style={labelStyle}>
            Nombre
          </label>
          <input
            id="name"
            name="name"
            defaultValue={user.name}
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass} style={labelStyle}>
            Correo (acceso)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass} style={labelStyle}>
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={user.phone}
            required
            className={fieldClass}
            style={fieldStyle}
          />
        </div>
        {hasVetProfile && (
          <div>
            <label htmlFor="bio" className={labelClass} style={labelStyle}>
              Bio / especialidad
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={bio}
              rows={3}
              placeholder="Ej. Medicina interna y dermatología veterinaria."
              className="w-full px-4 py-3 rounded-[12px] border outline-none text-[15px] font-semibold focus:border-[var(--vet-green)] transition-colors resize-y"
              style={fieldStyle}
            />
          </div>
        )}
        <div>
          <label className={labelClass} style={labelStyle}>
            Rol
          </label>
          <div
            className="inline-flex items-center px-3.5 py-2 rounded-full text-[12px] font-extrabold"
            style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
          >
            {user.roleLabel}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <button
            type="submit"
            disabled={pending}
            className="h-12 px-6 rounded-[14px] text-[15px] font-extrabold text-white transition-all disabled:opacity-60 hover:brightness-105 active:scale-[.99]"
            style={{
              background:
                "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
              boxShadow: "0 8px 24px var(--vet-green-glow)",
            }}
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ─── Password ──────────────────────────────────────────── */

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
      <h2 className="text-[14px] font-extrabold uppercase tracking-wider mb-1" style={labelStyle}>
        Seguridad
      </h2>
      <p className="text-[13px] font-semibold mb-4" style={{ color: "var(--vet-text-3)" }}>
        Cambia tu contraseña periódicamente.
      </p>
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="currentPassword" className={labelClass} style={labelStyle}>
            Contraseña actual
          </label>
          <input
            id="currentPassword"
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
            <label htmlFor="newPassword" className={labelClass} style={labelStyle}>
              Nueva contraseña
            </label>
            <input
              id="newPassword"
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
            <label htmlFor="confirmPassword" className={labelClass} style={labelStyle}>
              Confirmar
            </label>
            <input
              id="confirmPassword"
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
        <div className="flex">
          <button
            type="submit"
            disabled={pending}
            className="h-12 px-6 rounded-[14px] text-[15px] font-extrabold border transition-colors disabled:opacity-60"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-1)",
            }}
          >
            {pending ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}
