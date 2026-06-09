import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Clock, Tag, Stethoscope, Scissors } from "lucide-react";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { BackLink } from "@/components/BackLink";
import { FormBuilder } from "@/components/admin/FormBuilder";
import {
  parseFormSchema,
  DEFAULT_CONSULTA_SCHEMA,
  templateFor,
  templateKeyForServiceName,
  type FormSchema,
} from "@/lib/form-schema";

export const dynamic = "force-dynamic";

function formatMxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/inicio");

  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true } } },
  });
  if (!service) notFound();

  // Resolve the schema we'll seed the builder with: parsed JSON if it
  // exists, otherwise the closest matching template, otherwise the
  // default consulta schema.
  const parsed = parseFormSchema(service.formSchema);
  const initialSchema: FormSchema =
    parsed ??
    (() => {
      const key = templateKeyForServiceName(service.name);
      const t = templateFor(key);
      return t.sections.length > 0 ? t : DEFAULT_CONSULTA_SCHEMA;
    })();

  const isClinical = service.category === "CLINICAL";
  const catColor = isClinical ? "var(--vet-green)" : "var(--vet-blue-dim)";
  const CatIcon = isClinical ? Stethoscope : Scissors;

  return (
    <div className="flex flex-col gap-5">
      <BackLink
        fallbackHref="/admin/servicios"
        className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline self-start"
        style={{ color: "var(--vet-green)" }}
      >
        <ChevronLeft size={14} /> Volver
      </BackLink>

      {/* Service header card */}
      <div
        className="border p-4 rounded-[18px] flex items-center gap-3"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
        }}
      >
        <div
          className="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in oklab, ${catColor} 14%, transparent)`,
            color: catColor,
          }}
        >
          <CatIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[18px] font-black"
              style={{ color: "var(--vet-text-1)" }}
            >
              {service.name}
            </p>
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: `color-mix(in oklab, ${catColor} 14%, transparent)`,
                color: catColor,
              }}
            >
              {isClinical ? "Clínico" : "Estético"}
            </span>
            {!service.active && (
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
          {service.description && (
            <p
              className="text-[12px] font-semibold leading-snug"
              style={{ color: "var(--vet-text-3)" }}
            >
              {service.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-extrabold"
              style={{ color: "var(--vet-text-2)" }}
            >
              <Tag size={11} />
              <span className="vet-mono">{formatMxn(service.basePrice)}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-extrabold"
              style={{ color: "var(--vet-text-2)" }}
            >
              <Clock size={11} />
              {service.durationMinutes} min
            </span>
            <span
              className="text-[11px] font-extrabold"
              style={{ color: "var(--vet-text-3)" }}
            >
              {service._count.appointments} cita
              {service._count.appointments === 1 ? "" : "s"} agendadas
            </span>
          </div>
        </div>
        <a
          href="/admin/servicios"
          className="inline-flex items-center justify-center px-3 h-9 rounded-[10px] text-[12px] font-extrabold border transition-colors no-underline"
          style={{
            background: "var(--vet-bg-mid)",
            borderColor: "var(--vet-border)",
            color: "var(--vet-text-2)",
          }}
          title="Editar datos básicos del servicio"
        >
          Editar datos básicos
        </a>
      </div>

      {/* Section heading */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1
            className="text-[22px] font-black tracking-tight"
            style={{ color: "var(--vet-text-1)" }}
          >
            Formulario de consulta
          </h1>
          <p
            className="text-[12px] font-semibold"
            style={{ color: "var(--vet-text-3)" }}
          >
            Diseña los campos que el veterinario verá al atender este
            servicio. Los cambios se guardan automáticamente.
          </p>
        </div>
      </div>

      <FormBuilder schema={initialSchema} serviceId={service.id} />
    </div>
  );
}
