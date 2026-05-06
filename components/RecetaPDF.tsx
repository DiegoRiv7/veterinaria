import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Image,
} from "@react-pdf/renderer";
import { SPECIES_LABEL, SEX_LABEL, ageFromBirthDate } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type RecetaData = {
  id: string;
  scheduledAt: Date;
  vetNotes: string | null;
  instructions: string | null;
  medications: string | null;
  service: { name: string };
  pet: {
    name: string;
    species: string;
    breed: string | null;
    birthDate: Date | null;
    sex: string;
    weightKg: number | null;
    color: string | null;
    microchipId: string | null;
  };
  client: {
    name: string;
    phone: string | null;
  };
  vet: {
    user: { name: string; email: string | null };
    bio: string | null;
  };
};

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const COLORS = {
  pink: "#ce5a2d",   // primary terracotta (kept as 'pink' key for legacy refs)
  indigo: "#a8431a", // deep terracotta
  sky: "#e6b82d",    // mustard yellow
  ink: "#3a2a1e",
  text: "#3a2a1e",
  muted: "#8a6a55",
  soft: "#fbe7d4",
  border: "#f3d7bf",
  brandSoft: "#fbe1d0",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandLogo: {
    width: 52,
    height: 52,
  },
  brandTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    color: COLORS.sky,
    marginTop: 3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Gradient strip (faked with three colored rects side by side)
  gradientBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 14,
    marginBottom: 18,
  },
  gradSky: { flex: 1, backgroundColor: COLORS.sky },
  gradIndigo: { flex: 1, backgroundColor: COLORS.indigo },
  gradPink: { flex: 1, backgroundColor: COLORS.pink },

  // Receta label
  recetaLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  recetaTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.indigo,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  recetaMeta: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "right",
  },

  // Sections
  section: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  sectionAccent: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.soft,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.indigo,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // Two-column grid for data rows
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "50%",
    paddingRight: 8,
    marginBottom: 6,
  },
  gridItemFull: {
    width: "100%",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 11,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },

  // Body / paragraph text inside boxes
  paragraph: {
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // Medications list
  medItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  medNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.pink,
    color: COLORS.white,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 5,
    marginRight: 8,
  },
  medText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    paddingTop: 4,
    lineHeight: 1.4,
  },

  // Signature
  signatureBlock: {
    marginTop: 22,
    alignItems: "center",
  },
  signatureLine: {
    width: 220,
    height: 1,
    backgroundColor: COLORS.ink,
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  signatureRole: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },

  emptyText: {
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: "italic",
  },
});

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  // Manual AM/PM — keeps the receta consistent with the rest of the app.
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "p.m." : "a.m.";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

// Simple stylized paw mark using SVG paths (no emoji).
function PawMark() {
  return (
    <Svg width={28} height={28} viewBox="0 0 64 64">
      {/* Toe pads */}
      <Path d="M16 22 a6 7 0 1 0 0.001 0 z" fill={COLORS.pink} />
      <Path d="M28 14 a6 7 0 1 0 0.001 0 z" fill={COLORS.indigo} />
      <Path d="M40 14 a6 7 0 1 0 0.001 0 z" fill={COLORS.indigo} />
      <Path d="M52 22 a6 7 0 1 0 0.001 0 z" fill={COLORS.sky} />
      {/* Main pad */}
      <Path
        d="M22 42 c0 -8 5 -14 12 -14 c7 0 12 6 12 14 c0 8 -5 12 -12 12 c-7 0 -12 -4 -12 -12 z"
        fill={COLORS.pink}
      />
    </Svg>
  );
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value.length > 0 ? value : "—"}</Text>
    </View>
  );
}

export function RecetaPDF({
  data,
  logo,
}: {
  data: RecetaData;
  logo?: Buffer | null;
}) {
  const issuedAt = new Date();
  const age = ageFromBirthDate(data.pet.birthDate);
  const speciesLabel = SPECIES_LABEL[data.pet.species] ?? data.pet.species;
  const sexLabel = SEX_LABEL[data.pet.sex] ?? data.pet.sex;
  const weightStr =
    data.pet.weightKg != null ? `${data.pet.weightKg.toString()} kg` : null;

  const meds = (data.medications ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((line) => line.replace(/^\s*\d+[.)\-]\s*/, ""));

  return (
    <Document
      title={`Receta ${data.pet.name}`}
      author={data.vet.user.name}
      subject="Receta médica veterinaria"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandMark}>
            {logo ? (
              <Image src={logo} style={styles.brandLogo} />
            ) : (
              <PawMark />
            )}
          </View>
          <View>
            <Text style={styles.brandTitle}>Vetsfriend</Text>
            <Text style={styles.brandSubtitle}>Clínica & Grooming</Text>
          </View>
        </View>

        {/* Gradient bar — Vetsfriend palette: mustard → terracotta → deep terracotta */}
        <View style={styles.gradientBar}>
          <View style={styles.gradSky} />
          <View style={styles.gradPink} />
          <View style={styles.gradIndigo} />
        </View>

        {/* Receta heading row */}
        <View style={styles.recetaLabelRow}>
          <Text style={styles.recetaTitle}>Receta médica</Text>
          <View>
            <Text style={styles.recetaMeta}>Folio · {shortId(data.id)}</Text>
            <Text style={styles.recetaMeta}>
              Emitida el {formatLongDate(issuedAt)}
            </Text>
          </View>
        </View>

        {/* Datos del paciente */}
        <View style={styles.sectionAccent}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.grid}>
            <Field label="Nombre" value={data.pet.name} />
            <Field label="Especie" value={speciesLabel} />
            <Field label="Raza" value={data.pet.breed} />
            <Field label="Edad" value={age} />
            <Field label="Sexo" value={sexLabel} />
            <Field label="Peso" value={weightStr} />
            {data.pet.color ? <Field label="Color" value={data.pet.color} /> : null}
            {data.pet.microchipId ? (
              <Field label="Microchip" value={data.pet.microchipId} />
            ) : null}
          </View>
        </View>

        {/* Datos del propietario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del propietario</Text>
          <View style={styles.grid}>
            <Field label="Nombre" value={data.client.name} />
            <Field label="Teléfono" value={data.client.phone ?? null} />
          </View>
        </View>

        {/* Atendido por */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atendido por</Text>
          <View style={styles.grid}>
            <Field label="Veterinario" value={data.vet.user.name} />
            <Field label="Servicio" value={data.service.name} />
            <Field
              label="Fecha de consulta"
              value={`${formatLongDate(data.scheduledAt)} · ${formatTime(data.scheduledAt)}`}
            />
            {data.vet.user.email ? (
              <Field label="Contacto" value={data.vet.user.email} />
            ) : null}
          </View>
        </View>

        {/* Diagnóstico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnóstico</Text>
          {data.vetNotes && data.vetNotes.trim().length > 0 ? (
            <Text style={styles.paragraph}>{data.vetNotes}</Text>
          ) : (
            <Text style={styles.emptyText}>Sin diagnóstico registrado.</Text>
          )}
        </View>

        {/* Indicaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicaciones</Text>
          {data.instructions && data.instructions.trim().length > 0 ? (
            <Text style={styles.paragraph}>{data.instructions}</Text>
          ) : (
            <Text style={styles.emptyText}>Sin indicaciones específicas.</Text>
          )}
        </View>

        {/* Medicamentos */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Medicamentos</Text>
          {meds.length > 0 ? (
            meds.map((m, i) => (
              <View key={i} style={styles.medItem}>
                <Text style={styles.medNumber}>{i + 1}</Text>
                <Text style={styles.medText}>{m}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No se prescribieron medicamentos.</Text>
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureBlock} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{data.vet.user.name}</Text>
          <Text style={styles.signatureRole}>Médico veterinario</Text>
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={() =>
            `Receta digital · Vetsfriend · ${formatLongDate(issuedAt)}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export default RecetaPDF;
