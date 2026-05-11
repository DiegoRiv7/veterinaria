"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Stethoscope,
  Trash2,
  UserCircle2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { VetAvatar } from "@/components/VetAvatar";
import { createUserAction, removeUserAction } from "@/app/actions/admin";
import { DAY_LABEL } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────── */

type Vet = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  totalAppts: number;
  monthCompleted: number;
  monthRevenue: number;
};

type StaffUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  createdAt: string;
};

type Role = "VET" | "RECEPTIONIST" | "ADMIN";

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/* ─── Main ────────────────────────────────────────────── */

export function UsersPageClient({
  currentAdminId,
  vets,
  receptionists,
  admins,
}: {
  currentAdminId: string;
  vets: Vet[];
  receptionists: StaffUser[];
  admins: StaffUser[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[26px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Usuarios
          </h1>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Equipo de la clínica organizado por rol:{" "}
            {vets.length} veterinario{vets.length === 1 ? "" : "s"},{" "}
            {receptionists.length} recepcionista
            {receptionists.length === 1 ? "" : "s"}, {admins.length}{" "}
            administrador{admins.length === 1 ? "" : "es"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-[12px] text-[13px] font-extrabold text-white transition-all hover:brightness-105"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 6px 16px var(--vet-green-glow)",
          }}
        >
          <Plus size={14} strokeWidth={2.5} /> Crear usuario
        </button>
      </div>

      <Section
        title="Veterinarios"
        subtitle="Atienden las citas y aparecen en el flujo de agendar."
        icon={<Stethoscope size={14} />}
        color="var(--vet-green)"
        count={vets.length}
      >
        {vets.length === 0 ? (
          <EmptySection
            label="Aún no hay veterinarios"
            hint='Toca "Crear usuario" para agregar el primero.'
          />
        ) : (
          <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2">
            {vets.map((v) => (
              <VetCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Recepcionistas"
        subtitle="Pronto podrán agendar y cobrar en el mostrador."
        icon={<UsersIcon size={14} />}
        color="var(--vet-amber)"
        count={receptionists.length}
      >
        {receptionists.length === 0 ? (
          <EmptySection
            label="No hay recepcionistas registrados"
            hint="Cuando crees uno, podrás definir sus permisos más adelante."
          />
        ) : (
          <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2">
            {receptionists.map((u) => (
              <StaffCard
                key={u.id}
                u={u}
                accent="var(--vet-amber)"
                badge="Recepcionista"
                canRemove
                disabled={u.id === currentAdminId}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Administradores"
        subtitle="Acceso completo al panel y a este módulo de usuarios."
        icon={<UserCircle2 size={14} />}
        color="var(--vet-violet)"
        count={admins.length}
      >
        {admins.length === 0 ? (
          <EmptySection
            label="No hay administradores"
            hint="Necesitas al menos uno para gestionar la clínica."
          />
        ) : (
          <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2">
            {admins.map((u) => (
              <StaffCard
                key={u.id}
                u={u}
                accent="var(--vet-violet)"
                badge="Administrador"
                canRemove
                disabled={u.id === currentAdminId}
              />
            ))}
          </div>
        )}
      </Section>

      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
    </div>
  );
}

/* ─── Sections ────────────────────────────────────────── */

function Section({
  title,
  subtitle,
  icon,
  color,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
            color,
          }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-black"
            style={{ color: "var(--vet-text-1)" }}
          >
            {title}
            <span
              className="vet-mono text-[11px] font-extrabold ml-2 px-1.5 py-0.5 rounded-full"
              style={{
                background: `color-mix(in oklab, ${color} 14%, transparent)`,
                color,
              }}
            >
              {count}
            </span>
          </p>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptySection({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      className="border-dashed border p-8 rounded-[18px] flex flex-col items-center gap-1.5 text-center"
      style={{
        borderColor: "var(--vet-border)",
        background: "var(--vet-bg-mid)",
      }}
    >
      <p
        className="text-[13px] font-extrabold"
        style={{ color: "var(--vet-text-1)" }}
      >
        {label}
      </p>
      <p
        className="text-[12px] font-semibold"
        style={{ color: "var(--vet-text-3)" }}
      >
        {hint}
      </p>
    </div>
  );
}

/* ─── Cards ───────────────────────────────────────────── */

function VetCard({ v }: { v: Vet }) {
  return (
    <Link
      href={`/admin/usuarios/${v.id}`}
      className="border p-4 rounded-[16px] flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:[border-color:var(--vet-green)] no-underline"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        color: "var(--vet-text-1)",
      }}
    >
      <VetAvatar photoUrl={v.photoUrl} name={v.name} size="lg" />
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-extrabold truncate"
          style={{ color: "var(--vet-text-1)" }}
        >
          {v.name}
        </p>
        <p
          className="text-[12px] font-semibold truncate"
          style={{ color: "var(--vet-text-3)" }}
        >
          {v.email}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Chip
            label={`${v.totalAppts} citas total`}
            color="var(--vet-green)"
          />
          <Chip
            label={`${v.monthCompleted} este mes`}
            color="var(--vet-blue-dim)"
          />
          {v.monthRevenue > 0 && (
            <Chip
              label={formatMxn(v.monthRevenue)}
              color="var(--vet-violet)"
            />
          )}
        </div>
      </div>
      <ChevronRight size={18} color="var(--vet-text-3)" />
    </Link>
  );
}

function StaffCard({
  u,
  accent,
  badge,
  canRemove,
  disabled,
}: {
  u: StaffUser;
  accent: string;
  badge: string;
  canRemove?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (disabled) {
      toast.error("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!confirm(`¿Eliminar a ${u.name}?`)) return;
    startTransition(async () => {
      const result = await removeUserAction(u.id);
      if (result.ok) {
        toast.success(`${u.name} eliminado`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className="border p-4 rounded-[16px] flex items-center gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        color: "var(--vet-text-1)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white text-[14px] flex-shrink-0"
        style={{
          background: u.photoUrl
            ? "var(--vet-bg-mid)"
            : `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 70%, oklch(35% 0.12 30)))`,
        }}
      >
        {u.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={u.photoUrl}
            alt={u.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>
            {u.name
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-[15px] font-extrabold truncate"
            style={{ color: "var(--vet-text-1)" }}
          >
            {u.name}
          </p>
          {disabled && (
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
          className="text-[12px] font-semibold truncate"
          style={{ color: "var(--vet-text-3)" }}
        >
          {u.email} · {u.phone}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Chip label={badge} color={accent} />
          <Chip
            label={`desde ${formatDate(u.createdAt)}`}
            color="var(--vet-text-3)"
          />
        </div>
      </div>
      {canRemove && !disabled && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Eliminar"
          className="w-9 h-9 rounded-[8px] border flex items-center justify-center transition-colors disabled:opacity-60"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-red)",
          }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="vet-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full"
      style={{
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  );
}

/* ─── Create User Modal ───────────────────────────────── */

type Step = "role" | "details";

const ROLES: {
  key: Role;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "VET",
    label: "Veterinario",
    desc: "Atiende citas. Tendrá su agenda semanal.",
    icon: <Stethoscope size={18} />,
    color: "var(--vet-green)",
  },
  {
    key: "RECEPTIONIST",
    label: "Recepcionista",
    desc: "Agendará y atenderá en el mostrador (próximamente).",
    icon: <UsersIcon size={18} />,
    color: "var(--vet-amber)",
  },
  {
    key: "ADMIN",
    label: "Administrador",
    desc: "Acceso completo al panel y gestión de usuarios.",
    icon: <UserCircle2 size={18} />,
    color: "var(--vet-violet)",
  },
];

const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  dayOfWeek: d,
  isWorking: d !== 0,
  startMinutes: 540, // 9:00
  endMinutes: 1080, // 18:00
}));

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [hours, setHours] = useState(DEFAULT_HOURS);

  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function pickRole(r: Role) {
    setRole(r);
    setStep("details");
  }

  function patchHour(
    idx: number,
    patch: Partial<{
      isWorking: boolean;
      startMinutes: number;
      endMinutes: number;
    }>
  ) {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function submit() {
    if (!role) return;
    startTransition(async () => {
      const result = await createUserAction({
        role,
        name,
        email,
        phone,
        password,
        bio: role === "VET" ? bio : undefined,
        workingHours: role === "VET" ? hours : undefined,
      });
      if (result.ok) {
        toast.success(`Usuario "${name}" creado`);
        router.refresh();
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  const meta = role ? ROLES.find((r) => r.key === role)! : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "color-mix(in oklab, oklch(18% 0.04 40) 60%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] max-h-[92vh] flex flex-col rounded-[22px] border overflow-hidden"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          boxShadow:
            "0 30px 80px color-mix(in oklab, oklch(15% 0.05 40) 40%, transparent)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-b"
          style={{
            borderBottomColor: "var(--vet-border)",
            background: "var(--vet-bg-mid)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {step === "details" && (
              <button
                type="button"
                onClick={() => setStep("role")}
                className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors flex-shrink-0"
                style={{
                  background: "var(--vet-bg-card)",
                  borderColor: "var(--vet-border)",
                  color: "var(--vet-text-2)",
                }}
                aria-label="Atrás"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2
                className="text-[17px] font-black"
                style={{ color: "var(--vet-text-1)" }}
              >
                {step === "role" ? "Crear usuario" : `Nuevo ${meta?.label.toLowerCase()}`}
              </h2>
              <p
                className="text-[12px] font-semibold mt-0.5"
                style={{ color: "var(--vet-text-3)" }}
              >
                {step === "role"
                  ? "Selecciona el rol del nuevo miembro del equipo."
                  : "Datos de la cuenta para iniciar sesión."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors flex-shrink-0"
            style={{
              background: "var(--vet-bg-card)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 sm:p-6 flex flex-col gap-4">
          {step === "role" && (
            <div className="grid gap-3 grid-cols-1">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => pickRole(r.key)}
                  className="flex items-center gap-3 p-4 rounded-[14px] border text-left transition-all hover:-translate-y-0.5"
                  style={{
                    background: "var(--vet-bg-mid)",
                    borderColor: "var(--vet-border)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${r.color} 14%, transparent)`,
                      color: r.color,
                    }}
                  >
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-extrabold"
                      style={{ color: "var(--vet-text-1)" }}
                    >
                      {r.label}
                    </p>
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {r.desc}
                    </p>
                  </div>
                  <ChevronRight size={18} color="var(--vet-text-3)" />
                </button>
              ))}
            </div>
          )}

          {step === "details" && role && (
            <>
              <Field label="Nombre completo">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    role === "VET" ? "Dra. Ana Pérez" : "Nombre Apellido"
                  }
                  className={inputClass}
                  style={inputStyle}
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Correo (login)">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@vetsfriend.com"
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
                    placeholder="10 dígitos"
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field label="Contraseña temporal">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className={inputClass + " vet-mono"}
                  style={inputStyle}
                />
              </Field>

              {role === "VET" && (
                <>
                  <Field label="Bio / especialidad (opcional)">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="Cirujano de pequeñas especies, 8 años de experiencia"
                      className={inputClass + " resize-none h-auto py-2.5"}
                      style={inputStyle}
                    />
                  </Field>

                  <div className="flex flex-col gap-2">
                    <p
                      className="text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Agenda semanal
                    </p>
                    <p
                      className="text-[11px] font-semibold -mt-1"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Define los días y horarios en que estará disponible
                      para citas. Podrás ajustarlo después.
                    </p>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {hours.map((r, idx) => (
                        <div
                          key={r.dayOfWeek}
                          className="flex items-center gap-2"
                          style={{ opacity: r.isWorking ? 1 : 0.55 }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              patchHour(idx, { isWorking: !r.isWorking })
                            }
                            className="w-[88px] flex items-center gap-1.5 text-[12px] font-extrabold rounded-[8px] px-2 py-1.5 border transition-colors"
                            style={{
                              background: r.isWorking
                                ? "var(--vet-green-glow)"
                                : "var(--vet-bg-mid)",
                              borderColor: r.isWorking
                                ? "var(--vet-green)"
                                : "var(--vet-border)",
                              color: r.isWorking
                                ? "var(--vet-green)"
                                : "var(--vet-text-3)",
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
                            value={hhmm(r.startMinutes)}
                            onChange={(e) =>
                              patchHour(idx, {
                                startMinutes: hhmmToMinutes(e.target.value),
                              })
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
                            value={hhmm(r.endMinutes)}
                            onChange={(e) =>
                              patchHour(idx, {
                                endMinutes: hhmmToMinutes(e.target.value),
                              })
                            }
                            className="flex-1 h-9 px-2 rounded-[8px] border outline-none text-[12px] font-bold vet-mono text-center"
                            style={{
                              background: "var(--vet-bg-mid)",
                              borderColor: "var(--vet-border)",
                              color: "var(--vet-text-1)",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === "details" && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3 border-t"
            style={{
              borderTopColor: "var(--vet-border)",
              background: "var(--vet-bg-mid)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-[10px] border text-[13px] font-extrabold"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                color: "var(--vet-text-2)",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-10 px-5 rounded-[10px] text-[13px] font-extrabold text-white transition-all inline-flex items-center gap-1.5 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
                boxShadow: "0 4px 12px var(--vet-green-glow)",
              }}
            >
              {pending ? (
                "Creando…"
              ) : (
                <>
                  <Check size={14} /> Crear {meta?.label.toLowerCase()}
                </>
              )}
            </button>
          </div>
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

function hhmm(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hhmmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const inputClass =
  "w-full h-11 px-3 rounded-[10px] border outline-none text-[14px] font-bold transition-colors focus:[border-color:var(--vet-green)]";
const inputStyle = {
  background: "var(--vet-bg-mid)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
