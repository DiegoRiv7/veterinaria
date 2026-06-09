"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Edit3,
  ClipboardList,
  Stethoscope,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import {
  upsertServiceAction,
  deleteServiceAction,
} from "@/app/actions/admin";

type Category = "CLINICAL" | "AESTHETIC";

type Service = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  durationMinutes: number;
  active: boolean;
  category: Category;
  appointmentCount: number;
};

const CATEGORY_META: Record<
  Category,
  { label: string; color: string; icon: React.ReactNode; subtitle: string }
> = {
  CLINICAL: {
    label: "Servicios clínicos",
    color: "var(--vet-green)",
    icon: <Stethoscope size={14} />,
    subtitle: "Consultas, vacunas, cirugías, desparasitación.",
  },
  AESTHETIC: {
    label: "Servicios estéticos",
    color: "var(--vet-blue-dim)",
    icon: <Scissors size={14} />,
    subtitle: "Baño, corte de pelo, uñas, spa.",
  },
};

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ServicesEditor({ services }: { services: Service[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-extrabold uppercase tracking-[1px]"
          style={{ color: "var(--vet-text-3)" }}
        >
          {services.filter((s) => s.active).length} activos · {services.length} en
          total
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[12px] font-extrabold text-white transition-all"
          style={{
            background: creating
              ? "var(--vet-text-3)"
              : "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: creating ? "none" : "0 4px 12px var(--vet-green-glow)",
          }}
        >
          {creating ? (
            <>
              <X size={14} /> Cancelar
            </>
          ) : (
            <>
              <Plus size={14} /> Nuevo servicio
            </>
          )}
        </button>
      </div>

      {creating && (
        <ServiceForm
          mode="create"
          onCancel={() => setCreating(false)}
          onSaved={() => setCreating(false)}
        />
      )}

      {services.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="flex flex-col gap-6">
          {(["CLINICAL", "AESTHETIC"] as Category[]).map((cat) => {
            const inCat = services.filter((s) => s.category === cat);
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat} className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{
                      background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[15px] font-black"
                      style={{ color: "var(--vet-text-1)" }}
                    >
                      {meta.label}
                      <span
                        className="vet-mono text-[11px] font-extrabold ml-2 px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                          color: meta.color,
                        }}
                      >
                        {inCat.length}
                      </span>
                    </p>
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      {meta.subtitle}
                    </p>
                  </div>
                </div>
                {inCat.length === 0 ? (
                  <div
                    className="border-dashed border p-6 rounded-[14px] text-center"
                    style={{
                      borderColor: "var(--vet-border)",
                      background: "var(--vet-bg-mid)",
                    }}
                  >
                    <p
                      className="text-[12px] font-semibold"
                      style={{ color: "var(--vet-text-3)" }}
                    >
                      Aún no hay servicios{" "}
                      {cat === "CLINICAL" ? "clínicos" : "estéticos"}.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {inCat.map((s) =>
                      editingId === s.id ? (
                        <ServiceForm
                          key={s.id}
                          mode="edit"
                          initial={s}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => setEditingId(null)}
                        />
                      ) : (
                        <ServiceRow
                          key={s.id}
                          svc={s}
                          onEdit={() => setEditingId(s.id)}
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="border-dashed border p-10 rounded-[18px] flex flex-col items-center gap-3 text-center"
      style={{
        borderColor: "var(--vet-border)",
        background: "var(--vet-bg-mid)",
      }}
    >
      <div className="text-3xl">🩺</div>
      <p
        className="text-[14px] font-extrabold"
        style={{ color: "var(--vet-text-1)" }}
      >
        Aún no hay servicios
      </p>
      <p
        className="text-[12px] font-semibold"
        style={{ color: "var(--vet-text-3)" }}
      >
        Crea el primer servicio para que los clientes puedan reservar.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[12px] font-extrabold text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
        }}
      >
        <Plus size={14} /> Crear primer servicio
      </button>
    </div>
  );
}

function ServiceRow({
  svc,
  onEdit,
}: {
  svc: Service;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !confirm(
        `¿Eliminar “${svc.name}”?${svc.appointmentCount > 0 ? " Tiene citas registradas — se archivará en lugar de borrarse." : ""}`
      )
    )
      return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", svc.id);
        await deleteServiceAction(fd);
        toast.success("Servicio eliminado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div
      className="border p-4 rounded-[16px] flex items-center gap-3"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        opacity: svc.active ? 1 : 0.6,
      }}
    >
      <div
        className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
        style={{
          background: svc.active
            ? `color-mix(in oklab, ${CATEGORY_META[svc.category].color} 14%, transparent)`
            : "var(--vet-bg-hover)",
          color: svc.active
            ? CATEGORY_META[svc.category].color
            : "var(--vet-text-3)",
        }}
      >
        {CATEGORY_META[svc.category].icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="text-[14px] font-extrabold"
            style={{ color: "var(--vet-text-1)" }}
          >
            {svc.name}
          </p>
          {!svc.active && (
            <span
              className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--vet-bg-hover)",
                color: "var(--vet-text-3)",
              }}
            >
              Archivado
            </span>
          )}
        </div>
        {svc.description && (
          <p
            className="text-[12px] font-semibold leading-snug truncate"
            style={{ color: "var(--vet-text-3)" }}
          >
            {svc.description}
          </p>
        )}
        <p
          className="text-[11px] font-bold mt-0.5"
          style={{ color: "var(--vet-text-3)" }}
        >
          {svc.durationMinutes} min · {svc.appointmentCount} cita
          {svc.appointmentCount === 1 ? "" : "s"} agendadas
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span
          className="vet-mono text-[16px] font-extrabold"
          style={{ color: "var(--vet-green)" }}
        >
          {formatMxn(svc.basePrice)}
        </span>
        <div className="flex gap-1">
          <Link
            href={`/admin/servicios/${svc.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border transition-colors no-underline"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-green)",
            }}
            aria-label="Editar formulario de consulta"
            title="Editar formulario de consulta"
          >
            <ClipboardList size={14} />
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border transition-colors"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-text-2)",
            }}
            aria-label="Editar datos básicos"
            title="Editar datos básicos"
          >
            <Edit3 size={14} />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border transition-colors disabled:opacity-60"
            style={{
              background: "var(--vet-bg-mid)",
              borderColor: "var(--vet-border)",
              color: "var(--vet-red)",
            }}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceForm({
  mode,
  initial,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Service;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 500);
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [active, setActive] = useState(initial?.active ?? true);
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "CLINICAL"
  );
  const [pending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) return toast.error("Pon el nombre del servicio.");
    if (!Number.isFinite(basePrice) || basePrice < 0)
      return toast.error("Precio inválido.");
    startTransition(async () => {
      try {
        const fd = new FormData();
        if (initial?.id) fd.set("id", initial.id);
        fd.set("name", name.trim());
        fd.set("description", description.trim());
        fd.set("basePrice", String(basePrice));
        fd.set("durationMinutes", String(duration));
        fd.set("category", category);
        if (active) fd.set("active", "on");
        await upsertServiceAction(fd);
        toast.success(mode === "create" ? "Servicio creado" : "Cambios guardados");
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div
      className="border p-5 rounded-[18px] flex flex-col gap-3"
      style={{
        background: "var(--vet-bg-mid)",
        borderColor: "var(--vet-green)",
      }}
    >
      <p
        className="text-[11px] font-extrabold uppercase tracking-[1px]"
        style={{ color: "var(--vet-green)" }}
      >
        {mode === "create" ? "Nuevo servicio" : "Editar servicio"}
      </p>

      <FormField label="Nombre">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Limpieza dental"
          className={inputClass}
          style={inputStyle}
        />
      </FormField>

      <FormField label="Categoría">
        <div className="grid grid-cols-2 gap-2">
          {(["CLINICAL", "AESTHETIC"] as Category[]).map((c) => {
            const meta = CATEGORY_META[c];
            const isActive = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="flex items-center gap-2 px-3 h-11 rounded-[10px] border text-[13px] font-extrabold transition-colors"
                style={{
                  background: isActive
                    ? `color-mix(in oklab, ${meta.color} 14%, transparent)`
                    : "var(--vet-bg-card)",
                  borderColor: isActive ? meta.color : "var(--vet-border)",
                  color: isActive ? meta.color : "var(--vet-text-2)",
                }}
              >
                {meta.icon}
                {c === "CLINICAL" ? "Clínico" : "Estético"}
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label="Descripción (opcional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descripción que verá el cliente"
          rows={2}
          className={inputClass + " resize-none"}
          style={inputStyle}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Precio base (MXN)">
          <input
            type="number"
            min={0}
            step={1}
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
            className={inputClass + " vet-mono text-center"}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Duración (min)">
          <input
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 30)}
            className={inputClass + " vet-mono text-center"}
            style={inputStyle}
          />
        </FormField>
      </div>

      <label
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer"
        style={{
          background: "var(--vet-bg-card)",
          border: "1px solid var(--vet-border)",
        }}
      >
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4"
        />
        <span
          className="text-[13px] font-extrabold"
          style={{ color: "var(--vet-text-1)" }}
        >
          Visible para clientes
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-[12px] text-[13px] font-extrabold text-white transition-all disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--vet-green), var(--vet-green-dim))",
            boxShadow: "0 4px 12px var(--vet-green-glow)",
          }}
        >
          {pending ? (
            "Guardando…"
          ) : (
            <>
              <Check size={14} />{" "}
              {mode === "create" ? "Crear servicio" : "Guardar cambios"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 h-11 rounded-[12px] text-[13px] font-extrabold border"
          style={{
            background: "var(--vet-bg-card)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FormField({
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
  "w-full h-10 px-3 rounded-[10px] border outline-none text-[13px] font-bold transition-colors focus:[border-color:var(--vet-green)]";
const inputStyle = {
  background: "var(--vet-bg-card)",
  borderColor: "var(--vet-border)",
  color: "var(--vet-text-1)",
} as const;
