import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { InventoryViewClient } from "@/components/vet/InventoryViewClient";

export const dynamic = "force-dynamic";

const ITEMS = [
  { name: "Vacuna Antirrábica",   cat: "Vacunas",       current: 3,  min: 10, unit: "dosis",   exp: "Jun 2026", expSort: "2026-06", critical: true  },
  { name: "Vacuna Parvovirus",    cat: "Vacunas",       current: 18, min: 10, unit: "dosis",   exp: "Ago 2026", expSort: "2026-08", critical: false },
  { name: "Amoxicilina 500mg",    cat: "Antibióticos",  current: 8,  min: 20, unit: "comp",    exp: "Dic 2026", expSort: "2026-12", critical: true  },
  { name: "Metronidazol 250mg",   cat: "Antibióticos",  current: 45, min: 20, unit: "comp",    exp: "Nov 2026", expSort: "2026-11", critical: false },
  { name: "Isoflurano",           cat: "Anestesia",     current: 1,  min: 3,  unit: "frascos", exp: "Sep 2026", expSort: "2026-09", critical: true  },
  { name: "Propofol 10mg/ml",     cat: "Anestesia",     current: 6,  min: 5,  unit: "viales",  exp: "Jul 2026", expSort: "2026-07", critical: false },
  { name: "Suero Fisiológico 1L", cat: "Fluidoterapia", current: 24, min: 15, unit: "bolsas",  exp: "Mar 2027", expSort: "2027-03", critical: false },
  { name: "Jeringas 5ml",         cat: "Insumos",       current: 200,min: 100,unit: "und",     exp: "—",        expSort: "9999-99", critical: false },
];

export default async function VetInventoryPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENT") redirect("/inicio");

  return <InventoryViewClient items={ITEMS} />;
}
