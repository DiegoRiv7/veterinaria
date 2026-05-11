"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { VetAvatar } from "@/components/VetAvatar";
import {
  updateVetAction,
  resetVetPasswordAction,
  removeVetAction,
  updateVetWorkingHoursAction,
} from "@/app/actions/admin";
import { DAY_LABEL } from "@/lib/utils";

type VetData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string | null;
  photoUrl: string | null;
};

type Stats = {
  totalAppts: number;
  totalCompleted: number;
  totalRevenue: number;
  monthAppts: number;
  monthCompleted: number;
  monthRevenue: number;
  topService: { name: string; count: number } | null;
};

type WorkingHour = {
  dayOfWeek: number;
  isWorking: boolean;
  startMinutes: number;
  endMinutes: number;
};

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hhmmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function VetDetailClient({
  vet,
  stats,
  workingHours,
}: {
  vet: VetData;
  stats: Stats;
  workingHours: WorkingHour[];
}) {
  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-5">
        <Header vet={vet} stats={stats} />
        <ProfileEditor vet={vet} />
      </div>
      <div className="flex flex-col gap-5">
        <WorkingHoursEditor vetId={vet.id} initial={workingHours} />
        <SecuritySection vet={vet} hasAppointments={stats.totalAppts > 0} />
      </div>
    </div>
  );
}

function Header({ vet, stats }: { vet: VetData; stats: Stats }) {
  return (
    <div
      className="border p-5 rounded-[20px] flex flex-col gap-4"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div className="flex items-center gap-3">
        <VetAvatar photoUrl={vet.photoUrl} name={vet.name} size="lg" />
        <div className="flex-1 min-w-0">
          <p
            className="text-[20px] font-black truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {vet.name}
          </p>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {vet.email} · {vet.phone}
          </p>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-3">
        <Stat
          label="Total citas"
          value={String(stats.totalAppts)}
          color="var(--vet-text-1)"
        />
        <Stat
          label="Atendidas mes"
          value={String(stats.monthCompleted)}
          color="var(--vet-blue)"
        />
        <Stat
          label="Ingresos mes"
          value={formatMxn(stats.monthRevenue)}
          color="var(--vet-green)"
        />
      </div>
      {stats.topService && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
          style={{ background: "var(--vet-green-glow)" }}
        >
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider"
            style={{ color: "var(--vet-green)" }}
          >
            Servicio top
          </span>
          <span
            className="text-[13px] font-extrabold"
            style={{ color: "var(--vet-green)" }}
          >
            {stats.topService.name} · {stats.topService.count}
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[12px] p-3 border"
      style={{
        background: "var(--vet-bg-mid)",
        borderColor: "var(--vet-border)",
      }}
    >
      <p
        className="vet-mono text-[18px] font-bold leading-tight"
        style={{ color }}
      >
        {value}
      </p>
      <p
        className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5"
        style={{ color: "var(--vet-text-3)" }}
      >
        {label}
      </p>
    </div>
  );
}

function ProfileEditor({ vet }: { vet: VetData }) {
  const router = useRouter();
  const [name, setName] = useState(vet.name);
  const [email, setEmail] = useState(vet.email);
  const [phone, setPhone] = useState(vet.phone);
  const [bio, setBio] = useState(vet.bio ?? "");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    name.trim() !== vet.name ||
    email.trim().toLowerCase() !== vet.email.toLowerCase() ||
    phone.replace(/\D+/g, "") !== vet.phone ||
    bio.trim() !== (vet.bio ?? "").trim();

  function save() {
    startTransition(async () => {
      const result = await updateVetAction(vet.id, {
        name,
        email,
        phone,
        bio,
      });
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
        Datos del veterinario
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
      <Field label="Bio / especialidad">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className={inputClass + " resize-none h-auto py-2.5"}
          style={inputStyle}
        />
      </Field>

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
    </div>
  );
}

function WorkingHoursEditor({
  vetId,
  initial,
}: {
  vetId: string;
  initial: WorkingHour[];
}) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function patch(idx: number, patch: Partial<WorkingHour>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function save() {
    startTransition(async () => {
      const result = await updateVetWorkingHoursAction(vetId, rows);
      if (result.ok) {
        setSavedAt(Date.now());
        toast.success("Agenda guardada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function applyToAll(idx: number) {
    const src = rows[idx];
    setRows((prev) =>
      prev.map((r) =>
        r.isWorking
          ? { ...r, startMinutes: src.startMinutes, endMinutes: src.endMinutes }
          : r
      )
    );
  }

  return (
    <div
      className="border p-5 rounded-[20px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-extrabold uppercase tracking-[1px]"
          style={{ color: "var(--vet-text-3)" }}
        >
          Agenda semanal
        </p>
        <span
          className="text-[10px] font-bold"
          style={{ color: "var(--vet-text-3)" }}
        >
          Sólo aplica a este veterinario
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r, idx) => (
          <div
            key={r.dayOfWeek}
            className="flex items-center gap-2"
            style={{ opacity: r.isWorking ? 1 : 0.55 }}
          >
            <button
              type="button"
              onClick={() =>
                patch(idx, { isWorking: !r.isWorking })
              }
              className="w-[88px] flex items-center gap-1.5 text-[12px] font-extrabold rounded-[8px] px-2 py-1.5 border transition-colors"
              style={{
                background: r.isWorking
                  ? "var(--vet-green-glow)"
                  : "var(--vet-bg-mid)",
                borderColor: r.isWorking
                  ? "var(--vet-green)"
                  : "var(--vet-border)",
                color: r.isWorking ? "var(--vet-green)" : "var(--vet-text-3)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: r.isWorking
                    ? "var(--vet-green)"
                    : "var(--vet-text-3)",
                }}
              />
              {DAY_LABEL[r.dayOfWeek].slice(0, 3)}
            </button>
            <input
              type="time"
              disabled={!r.isWorking}
              value={minutesToHHMM(r.startMinutes)}
              onChange={(e) =>
                patch(idx, { startMinutes: hhmmToMinutes(e.target.value) })
              }
              className="flex-1 h-9 px-2 rounded-[8px] border outline-none text-[12px] font-bold vet-mono text-center"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            />
            <span style={{ color: "var(--vet-text-3)" }}>—</span>
            <input
              type="time"
              disabled={!r.isWorking}
              value={minutesToHHMM(r.endMinutes)}
              onChange={(e) =>
                patch(idx, { endMinutes: hhmmToMinutes(e.target.value) })
              }
              className="flex-1 h-9 px-2 rounded-[8px] border outline-none text-[12px] font-bold vet-mono text-center"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-1)",
              }}
            />
            <button
              type="button"
              onClick={() => applyToAll(idx)}
              disabled={!r.isWorking}
              title="Copiar este horario a todos los días abiertos"
              className="text-[10px] font-extrabold px-2 h-9 rounded-[8px] border whitespace-nowrap disabled:opacity-50"
              style={{
                background: "var(--vet-bg-mid)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              ⇧ Todos
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="self-end inline-flex items-center gap-1.5 px-4 h-10 rounded-[10px] text-[12px] font-extrabold text-white transition-all disabled:opacity-60"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
          boxShadow: "0 4px 12px var(--vet-green-glow)",
        }}
      >
        {pending ? (
          "Guardando…"
        ) : savedAt && Date.now() - savedAt < 2500 ? (
          <>
            <Check size={14} /> Guardado
          </>
        ) : (
          "Guardar agenda"
        )}
      </button>
    </div>
  );
}

function SecuritySection({
  vet,
  hasAppointments,
}: {
  vet: VetData;
  hasAppointments: boolean;
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
      const result = await resetVetPasswordAction(vet.id, pwd);
      if (result.ok) {
        toast.success(
          `Contraseña restablecida para ${vet.name}. Compártesela.`
        );
        setPwd("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove() {
    if (
      !confirm(
        `¿Eliminar a ${vet.name}? Esta acción borra el usuario y su perfil veterinario.`
      )
    )
      return;
    startDel(async () => {
      try {
        const fd = new FormData();
        fd.set("id", vet.id);
        await removeVetAction(fd);
        toast.success("Veterinario eliminado");
        router.push("/admin/usuarios");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
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
          El veterinario podrá entrar con esta contraseña al instante.
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
          disabled={pendingDel || hasAppointments}
          className="inline-flex items-center gap-1.5 px-3 h-10 rounded-[10px] text-[12px] font-extrabold transition-colors disabled:opacity-50 self-start"
          style={{
            background: "color-mix(in oklab, var(--vet-red) 12%, transparent)",
            border: "1px solid color-mix(in oklab, var(--vet-red) 30%, transparent)",
            color: "var(--vet-red)",
          }}
        >
          <Trash2 size={14} /> Eliminar veterinario
        </button>
        {hasAppointments && (
          <p
            className="text-[10px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            No se puede eliminar porque ya tiene citas registradas. Borra o
            reasigna sus citas primero.
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
