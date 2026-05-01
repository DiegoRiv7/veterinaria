import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ITEMS = [
  { name: "Vacuna Antirrábica",   cat: "Vacunas",      current: 3,  min: 10, unit: "dosis",   exp: "Jun 2026", critical: true  },
  { name: "Vacuna Parvovirus",    cat: "Vacunas",      current: 18, min: 10, unit: "dosis",   exp: "Ago 2026", critical: false },
  { name: "Amoxicilina 500mg",    cat: "Antibióticos", current: 8,  min: 20, unit: "comp",    exp: "Dic 2026", critical: true  },
  { name: "Metronidazol 250mg",   cat: "Antibióticos", current: 45, min: 20, unit: "comp",    exp: "Nov 2026", critical: false },
  { name: "Isoflurano",           cat: "Anestesia",    current: 1,  min: 3,  unit: "frascos", exp: "Sep 2026", critical: true  },
  { name: "Propofol 10mg/ml",     cat: "Anestesia",    current: 6,  min: 5,  unit: "viales",  exp: "Jul 2026", critical: false },
  { name: "Suero Fisiológico 1L", cat: "Fluidoterapia",current: 24, min: 15, unit: "bolsas",  exp: "Mar 2027", critical: false },
  { name: "Jeringas 5ml",         cat: "Insumos",      current: 200,min: 100,unit: "und",     exp: "—",        critical: false },
];

export default async function VetInventoryPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  const criticalCount = ITEMS.filter((i) => i.critical).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[22px] font-black tracking-tight" style={{ color: "var(--vet-text-1)" }}>
              Inventario
            </h2>
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full"
              style={{ background: "var(--vet-amber-glow)", color: "var(--vet-amber)" }}
            >
              Próximamente
            </span>
          </div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
            Vista demo · {ITEMS.length} ítems · {criticalCount} alertas
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3 rounded-[14px] border text-[13px] font-semibold leading-relaxed"
        style={{
          background: "var(--vet-amber-glow)",
          borderColor: "color-mix(in oklab, var(--vet-amber) 40%, transparent)",
          color: "var(--vet-text-2)",
        }}
      >
        Esta sección aún no está conectada a la base de datos. Los valores que ves son ejemplos para mostrar el diseño. Si la veterinaria llega a necesitar control de stock, lo conectamos.
      </div>

      {/* Desktop table */}
      <div
        className="hidden md:block overflow-hidden border"
        style={{
          background: "var(--vet-bg-card)",
          borderColor: "var(--vet-border)",
          borderRadius: 22,
        }}
      >
        <div
          className="grid items-center px-5 py-2.5 border-b"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 90px",
            background: "var(--vet-bg-mid)",
            borderBottomColor: "var(--vet-border)",
          }}
        >
          {["Producto", "Categoría", "Stock", "Mínimo", "Vence", "Estado"].map((h) => (
            <div
              key={h}
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: "var(--vet-text-3)" }}
            >
              {h}
            </div>
          ))}
        </div>
        {ITEMS.map((item, i) => {
          const pct = Math.min((item.current / item.min) * 100, 100);
          return (
            <div
              key={item.name}
              className="grid items-center px-5 py-3"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 90px",
                borderBottom: i < ITEMS.length - 1 ? "1px solid var(--vet-border)" : "none",
              }}
            >
              <div className="font-bold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
                {item.name}
              </div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-2)" }}>
                {item.cat}
              </div>
              <div
                className="vet-mono text-[14px] font-bold"
                style={{ color: item.critical ? "var(--vet-red)" : "var(--vet-text-1)" }}
              >
                {item.current}{" "}
                <span className="text-[11px]" style={{ color: "var(--vet-text-3)" }}>
                  {item.unit}
                </span>
              </div>
              <div>
                <div className="h-[5px] rounded-full w-16" style={{ background: "var(--vet-bg-hover)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct < 50 ? "var(--vet-red)" : pct < 80 ? "var(--vet-amber)" : "var(--vet-green)",
                    }}
                  />
                </div>
              </div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                {item.exp}
              </div>
              <div>
                {item.critical ? (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                    style={{
                      background: "oklch(60% 0.20 20 / 0.15)",
                      color: "var(--vet-red)",
                      borderColor: "oklch(60% 0.20 20 / 0.30)",
                    }}
                  >
                    ⚠ Bajo
                  </span>
                ) : (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
                    style={{
                      background: "var(--vet-green-glow)",
                      color: "var(--vet-green)",
                      borderColor: "color-mix(in oklab, var(--vet-green) 30%, transparent)",
                    }}
                  >
                    OK
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2.5">
        {ITEMS.map((item) => {
          const pct = Math.min((item.current / item.min) * 100, 100);
          return (
            <div
              key={item.name}
              className="p-4 border"
              style={{
                background: "var(--vet-bg-card)",
                borderColor: "var(--vet-border)",
                borderRadius: 14,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold text-[14px]" style={{ color: "var(--vet-text-1)" }}>
                    {item.name}
                  </div>
                  <div className="text-[12px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
                    {item.cat} · vence {item.exp}
                  </div>
                </div>
                {item.critical ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
                    style={{ background: "oklch(60% 0.20 20 / 0.15)", color: "var(--vet-red)" }}
                  >
                    ⚠ Bajo
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
                    style={{ background: "var(--vet-green-glow)", color: "var(--vet-green)" }}
                  >
                    OK
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="vet-mono text-[14px] font-bold"
                  style={{ color: item.critical ? "var(--vet-red)" : "var(--vet-text-1)" }}
                >
                  {item.current}/{item.min} {item.unit}
                </span>
                <div className="h-[5px] flex-1 rounded-full" style={{ background: "var(--vet-bg-hover)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct < 50 ? "var(--vet-red)" : pct < 80 ? "var(--vet-amber)" : "var(--vet-green)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
