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
import { formatClinicTime } from "@/lib/clinic-time";

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
    licenseNumber: string | null;
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
    paddingTop: 26,
    paddingBottom: 42,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    marginRight: 11,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 8.5,
    color: COLORS.sky,
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Gradient strip (faked with three colored rects side by side)
  gradientBar: {
    flexDirection: "row",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 12,
  },
  gradSky: { flex: 1, backgroundColor: COLORS.sky },
  gradIndigo: { flex: 1, backgroundColor: COLORS.indigo },
  gradPink: { flex: 1, backgroundColor: COLORS.pink },

  // Receta label
  recetaLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  recetaTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: COLORS.indigo,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  recetaMeta: {
    fontSize: 8.5,
    color: COLORS.muted,
    textAlign: "right",
    marginTop: 1,
  },
  recetaVet: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    textAlign: "right",
  },
  recetaCedula: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.indigo,
    textAlign: "right",
    marginTop: 1.5,
  },

  // Sections
  section: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 9,
    backgroundColor: COLORS.white,
  },
  sectionAccent: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 9,
    backgroundColor: COLORS.soft,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.indigo,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 5,
  },

  // Two-column grid for data rows
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "25%",
    paddingRight: 7,
    marginBottom: 4,
  },
  gridItemFull: {
    width: "100%",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.5,
  },
  fieldValue: {
    fontSize: 9.5,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },

  // Body / paragraph text inside boxes
  paragraph: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // Medications list
  medItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  medNumber: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.pink,
    color: COLORS.white,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 3.5,
    marginRight: 7,
  },
  medText: {
    flex: 1,
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 2.5,
    lineHeight: 1.35,
  },

  // Signature
  signatureBlock: {
    marginTop: "auto",
    paddingTop: 16,
    alignItems: "center",
  },
  signatureLine: {
    width: 200,
    height: 1,
    backgroundColor: COLORS.ink,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
  },
  signatureRole: {
    fontSize: 8.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 14,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 7,
  },

  emptyText: {
    fontSize: 10,
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
  // Siempre en hora de la clínica — ver lib/clinic-time.ts.
  return formatClinicTime(date);
}

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

// Simple stylized paw mark using SVG paths (no emoji).
function PawMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 64 64">
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
            <Text style={styles.recetaVet}>MVZ {data.vet.user.name}</Text>
            {data.vet.licenseNumber ? (
              <Text style={styles.recetaCedula}>
                Céd. Prof. {data.vet.licenseNumber}
              </Text>
            ) : null}
            <Text style={styles.recetaMeta}>
              Emitida el {formatLongDate(issuedAt)}
            </Text>
          </View>
        </View>

        {/* Paciente · propietario · consulta — todo en un solo bloque */}
        <View style={styles.sectionAccent}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.grid}>
            <Field label="Paciente" value={data.pet.name} />
            <Field label="Especie" value={speciesLabel} />
            <Field label="Raza" value={data.pet.breed} />
            <Field label="Edad" value={age} />
            <Field label="Sexo" value={sexLabel} />
            <Field label="Peso" value={weightStr} />
            {data.pet.color ? <Field label="Color" value={data.pet.color} /> : null}
            {data.pet.microchipId ? (
              <Field label="Microchip" value={data.pet.microchipId} />
            ) : null}
            <Field label="Propietario" value={data.client.name} />
            <Field label="Teléfono" value={data.client.phone ?? null} />
            <Field label="Servicio" value={data.service.name} />
            <Field
              label="Fecha de consulta"
              value={`${formatLongDate(data.scheduledAt)} · ${formatTime(data.scheduledAt)}`}
            />
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
        <View style={styles.section}>
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
          <Text style={styles.signatureName}>MVZ {data.vet.user.name}</Text>
          <Text style={styles.signatureRole}>
            {data.vet.licenseNumber
              ? `Médico Veterinario Zootecnista · Céd. Prof. ${data.vet.licenseNumber}`
              : "Médico Veterinario Zootecnista"}
          </Text>
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={() =>
            `Receta digital · Folio ${shortId(data.id)} · Vetsfriend · ${formatLongDate(issuedAt)}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

export default RecetaPDF;
