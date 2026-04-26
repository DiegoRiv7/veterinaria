import Database from "better-sqlite3";
const db = new Database("/Users/diegorivera7/veterinaria/dev.db");

const clientRow = db.prepare("SELECT id FROM User WHERE phone='5559998888'").get();
const petRow = db.prepare("SELECT id, species FROM Pet WHERE ownerId=?").get(clientRow.id);
const vetRow = db.prepare(`SELECT v.id FROM Veterinarian v JOIN User u ON u.id=v.userId WHERE u.phone='5551110001'`).get();
const vet2Row = db.prepare(`SELECT v.id FROM Veterinarian v JOIN User u ON u.id=v.userId WHERE u.phone='5551110002'`).get();
const svc = db.prepare("SELECT id, basePrice, durationMinutes FROM Service WHERE name='Consulta general'").get();
const svcVac = db.prepare("SELECT id, basePrice, durationMinutes FROM Service WHERE name='Vacunación'").get();

const now = new Date();
const t1 = new Date(now); t1.setDate(t1.getDate() + 1); t1.setHours(10, 0, 0, 0);
const t2 = new Date(now); t2.setDate(t2.getDate() + 2); t2.setHours(12, 30, 0, 0);
const t3 = new Date(now); t3.setDate(t3.getDate() - 5); t3.setHours(11, 0, 0, 0);

function insertAppt(opts) {
  const id = "demo_" + Math.random().toString(36).slice(2, 11);
  const updatedAt = new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO Appointment
    (id, clientId, petId, vetId, serviceId, scheduledAt, durationMinutes, status, priceEstimate, clientNotes, vetNotes, instructions, medications, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    clientRow.id,
    petRow.id,
    opts.vetId,
    opts.serviceId,
    opts.scheduledAt.toISOString(),
    opts.durationMinutes,
    opts.status,
    opts.priceEstimate,
    opts.clientNotes ?? null,
    opts.vetNotes ?? null,
    opts.instructions ?? null,
    opts.medications ?? null,
    new Date().toISOString(),
    updatedAt,
  );
}

insertAppt({
  vetId: vetRow.id,
  serviceId: svc.id,
  scheduledAt: t1,
  durationMinutes: svc.durationMinutes,
  status: "SCHEDULED",
  priceEstimate: svc.basePrice,
  clientNotes: "Ha estado decaído desde el lunes.",
});

insertAppt({
  vetId: vet2Row.id,
  serviceId: svcVac.id,
  scheduledAt: t2,
  durationMinutes: svcVac.durationMinutes,
  status: "SCHEDULED",
  priceEstimate: svcVac.basePrice,
});

insertAppt({
  vetId: vetRow.id,
  serviceId: svc.id,
  scheduledAt: t3,
  durationMinutes: svc.durationMinutes,
  status: "COMPLETED",
  priceEstimate: svc.basePrice,
  clientNotes: "Está tosiendo por las mañanas.",
  vetNotes: "Signos vitales normales. Leve irritación de garganta, probable rinotraqueítis leve.",
  instructions: "Mantener hidratación. Evitar cambios bruscos de temperatura. Reposo 3 días. Control en 7 días si no mejora.",
  medications: "1. Mucolítico jarabe (Mucolin) 5 ml cada 12 horas x 5 días.\n2. Amoxicilina 250 mg cada 8 horas x 7 días.",
});

console.log("Demo appointments created.");
