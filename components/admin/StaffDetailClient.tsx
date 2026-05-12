"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Trash2,
  UserCircle2,
  Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateStaffAction,
  resetUserPasswordAction,
  removeUserAction,
} from "@/app/actions/admin";

type UserData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  role: "ADMIN" | "RECEPTIONIST";
  createdAt: string;
};

const ROLE_META: Record<UserData["role"], { label: string; color: string; icon: React.ReactNode; subtitle: string }> = {
  ADMIN: {
    label: "Administrador",
    color: "var(--vet-violet)",
    icon: <UserCircle2 size={20} />,
    subtitle: "Acceso completo al panel y gestión de usuarios.",
  },
  RECEPTIONIST: {
    label: "Recepcionista",
    color: "var(--vet-amber)",
    icon: <UsersIcon size={20} />,
    subtitle: "Próximamente podrá agendar y atender en el mostrador.",
  },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StaffDetailClient({
  user,
  isSelf,
}: {
  user: UserData;
  isSelf: boolean;
}) {
  const meta = ROLE_META[user.role];
  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-5">
        <Header user={user} meta={meta} isSelf={isSelf} />
        <ProfileEditor user={user} isSelf={isSelf} />
      </div>
      <div className="flex flex-col gap-5">
        <SecuritySection user={user} isSelf={isSelf} />
      </div>
    </div>
  );
}

function Header({
  user,
  meta,
  isSelf,
}: {
  user: UserData;
  meta: (typeof ROLE_META)[UserData["role"]];
  isSelf: boolean;
}) {
  return (
    <div
      className="border p-5 rounded-[20px] flex items-center gap-4"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div
        className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white text-[18px] flex-shrink-0"
        style={{
          background: user.photoUrl
            ? "var(--vet-bg-mid)"
            : `linear-gradient(135deg, ${meta.color}, color-mix(in oklab, ${meta.color} 70%, oklch(35% 0.12 30)))`,
        }}
      >
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials(user.name)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="text-[20px] font-black truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {user.name}
          </p>
          {isSelf && (
            <span
              className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--vet-green-glow)",
                color: "var(--vet-green)",
              }}
            >
              Tú
            </span>
          )}
        </div>
        <p
          className="text-[12px] font-semibold"
          style={{ color: "var(--vet-text-3)" }}
        >
          {user.email} · {user.phone}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold"
            style={{
              background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
              color: meta.color,
            }}
          >
            <span className="opacity-80">{meta.icon}</span>
            {meta.label}
          </span>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Desde {formatDate(user.createdAt)}
          </span>
        </div>
        <p
          className="text-[12px] font-semibold mt-2"
          style={{ color: "var(--vet-text-3)" }}
        >
          {meta.subtitle}
        </p>
      </div>
    </div>
  );
}

function ProfileEditor({
  user,
  isSelf,
}: {
  user: UserData;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    name.trim() !== user.name ||
    email.trim().toLowerCase() !== user.email.toLowerCase() ||
    phone.replace(/\D+/g, "") !== user.phone;

  function save() {
    startTransition(async () => {
      const result = await updateStaffAction(user.id, { name, email, phone });
      if (result.ok) {
        setSavedAt(Date.now());
        toast.success("Datos guardados");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className="border p-5 rounded-[20px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <p
        className="text-[11px] font-extrabold uppercase tracking-[1px]"
        style={{ color: "var(--vet-text-3)" }}
      >
        Datos del usuario
      </p>

      <Field label="Nombre completo">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Correo (login)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="self-end inline-flex items-center gap-1.5 px-4 h-10 rounded-[10px] text-[12px] font-extrabold text-white transition-all disabled:opacity-50"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: dirty ? "0 4px 12px var(--vet-green-glow)" : "none",
        }}
      >
        {pending ? (
          "Guardando…"
        ) : savedAt && Date.now() - savedAt < 2500 ? (
          <>
            <Check size={14} /> Guardado
          </>
        ) : (
          "Guardar cambios"
        )}
      </button>

      {isSelf && (
        <p
          className="text-[11px] font-semibold mt-1"
          style={{ color: "var(--vet-text-3)" }}
        >
          Tip: para cambiar tu propia foto y datos personales, también
          podés usar Perfil en el sidebar.
        </p>
      )}
    </div>
  );
}

function SecuritySection({
  user,
  isSelf,
}: {
  user: UserData;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [pendingPwd, startPwd] = useTransition();
  const [pendingDel, startDel] = useTransition();

  function reset() {
    if (!pwd || pwd.length < 4) {
      toast.error("Mínimo 4 caracteres.");
      return;
    }
    startPwd(async () => {
      const result = await resetUserPasswordAction(user.id, pwd);
      if (result.ok) {
        toast.success(`Contraseña restablecida para ${user.name}.`);
        setPwd("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción borra la cuenta.`))
      return;
    startDel(async () => {
      const result = await removeUserAction(user.id);
      if (result.ok) {
        toast.success("Usuario eliminado");
        router.push("/admin/usuarios");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className="border p-5 rounded-[20px] flex flex-col gap-4"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <p
        className="text-[11px] font-extrabold uppercase tracking-[1px]"
        style={{ color: "var(--vet-text-3)" }}
      >
        Seguridad
      </p>

      <div>
        <label
          className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          Restablecer contraseña
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Nueva contraseña temporal"
            className={inputClass + " vet-mono"}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={reset}
            disabled={pendingPwd || pwd.length < 4}
            className="inline-flex items-center gap-1.5 px-3 h-11 rounded-[10px] text-[12px] font-extrabold text-white whitespace-nowrap disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--vet-amber), oklch(58% 0.16 45))",
              boxShadow: "0 4px 12px var(--vet-amber-glow)",
            }}
          >
            <KeyRound size={14} /> Resetear
          </button>
        </div>
        <p
          className="text-[10px] font-semibold mt-1.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          {user.name} podrá entrar con esta contraseña al instante.
          Compártela por un canal seguro.
        </p>
      </div>

      <div
        className="border-t pt-4 flex flex-col gap-2"
        style={{ borderTopColor: "var(--vet-border)" }}
      >
        <p
          className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: "var(--vet-red)" }}
        >
          <AlertTriangle size={11} /> Zona peligrosa
        </p>
        <button
          type="button"
          onClick={remove}
          disabled={pendingDel || isSelf}
          className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[10px] text-[12px] font-extrabold transition-colors disabled:opacity-50 self-start"
          style={{
            background: "color-mix(in oklab, var(--vet-red) 12%, transparent)",
            border:
              "1px solid color-mix(in oklab, var(--vet-red) 30%, transparent)",
            color: "var(--vet-red)",
          }}
        >
          <Trash2 size={14} /> Eliminar usuario
        </button>
        {isSelf && (
          <p
            className="text-[10px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            No puedes eliminar tu propio usuario.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-11 px-3 rounded-[10px] border outline-none text-[14px] font-bold transition-colors focus:[border-color:var(--vet-green)]";
const inputStyle = {
  background: "var(--vet-bg-mid)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
