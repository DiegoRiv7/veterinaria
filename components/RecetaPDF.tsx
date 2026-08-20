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

/**
 * La receta es "responsive": estimamos cuánto contenido hay y generamos los
 * estilos con un factor de escala `k`. Con poco contenido k=1 (tamaños
 * cómodos, la firma sigue al contenido); con mucho contenido k baja hasta
 * 0.78 y todo se compacta para no pasar de una hoja.
 */
function makeStyles(k: number) {
  // Redondeo a medios puntos para tipografía limpia.
  const sz = (n: number) => Math.round(n * k * 2) / 2;
  const lh = k < 0.95 ? 1.32 : 1.4;

  return StyleSheet.create({
    page: {
      paddingTop: 26,
      paddingBottom: 42,
      paddingHorizontal: 36,
      fontFamily: "Helvetica",
      fontSize: sz(10.5),
      color: COLORS.text,
      backgroundColor: COLORS.white,
    },

    // Header (tamaño fijo — es la identidad de la clínica)
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
      marginBottom: sz(12),
    },
    gradSky: { flex: 1, backgroundColor: COLORS.sky },
    gradIndigo: { flex: 1, backgroundColor: COLORS.indigo },
    gradPink: { flex: 1, backgroundColor: COLORS.pink },

    // Receta label
    recetaLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: sz(10),
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
      marginBottom: sz(8),
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8,
      padding: sz(9),
      backgroundColor: COLORS.white,
    },
    sectionAccent: {
      marginBottom: sz(8),
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 8,
      padding: sz(9),
      backgroundColor: COLORS.soft,
    },
    sectionTitle: {
      fontSize: sz(8),
      fontFamily: "Helvetica-Bold",
      color: COLORS.indigo,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      marginBottom: sz(5),
    },

    // Four-column grid for data rows
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    gridItem: {
      width: "25%",
      paddingRight: 7,
      marginBottom: sz(4),
    },
    gridItemFull: {
      width: "100%",
      marginBottom: sz(4),
    },
    fieldLabel: {
      fontSize: sz(7),
      color: COLORS.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 1.5,
    },
    fieldValue: {
      fontSize: sz(9.5),
      color: COLORS.ink,
      fontFamily: "Helvetica-Bold",
    },

    // Body / paragraph text inside boxes
    paragraph: {
      fontSize: sz(10),
      color: COLORS.text,
      lineHeight: lh,
    },

    // Medications list
    medItem: {
      flexDirection: "row",
      marginBottom: sz(4),
    },
    medNumber: {
      width: sz(17),
      height: sz(17),
      borderRadius: sz(17) / 2,
      backgroundColor: COLORS.pink,
      color: COLORS.white,
      fontSize: sz(8.5),
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      paddingTop: sz(3.5),
      marginRight: 7,
    },
    medText: {
      flex: 1,
      fontSize: sz(10),
      color: COLORS.text,
      paddingTop: sz(2.5),
      lineHeight: lh,
    },

    // Signature — sigue al contenido (sin anclarse al fondo de la hoja)
    signatureBlock: {
      marginTop: sz(26),
      alignItems: "center",
    },
    signatureLine: {
      width: 200,
      height: 1,
      backgroundColor: COLORS.ink,
      marginBottom: 5,
    },
    signatureName: {
      fontSize: sz(10.5),
      fontFamily: "Helvetica-Bold",
      color: COLORS.ink,
    },
    signatureRole: {
      fontSize: sz(8.5),
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
      fontSize: sz(10),
      color: COLORS.muted,
      fontStyle: "italic",
    },
  });
}

type Styles = ReturnType<typeof makeStyles>;

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

/** Líneas estimadas de un texto al renderizarse (~chars por línea). */
function estimateLines(text: string | null, charsPerLine: number) {
  const t = (text ?? "").trim();
  if (!t) return 1; // el texto "sin registro" en cursiva
  return t
    .split(/\r?\n/)
    .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
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

function Field({
  styles,
  label,
  value,
}: {
  styles: Styles;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value.length > 0 ? value : "—"}</Text>
    </View>
  );
}

/** Renglones de medicamentos a partir del texto capturado. */
function parseMeds(medications: string | null): string[] {
  return (medications ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((line) => line.replace(/^\s*\d+[.)\-]\s*/, ""));
}

/**
 * Escala adaptativa: estima la altura del contenido a k=1 y, si no cabe en
 * la hoja, compacta (hasta 0.72). La ruta puede re-renderizar con una
 * escala menor si aun así se pasó de una página.
 */
export function computeRecetaScale(data: RecetaData): number {
  const meds = parseMeds(data.medications);
  const fieldCount =
    10 + (data.pet.color ? 1 : 0) + (data.pet.microchipId ? 1 : 0);
  const estimated =
    150 + // header + barra + encabezado de receta
    (28 + Math.ceil(fieldCount / 4) * 26) + // bloque de datos
    3 * 32 + // marco de las 3 secciones de texto
    estimateLines(data.vetNotes, 95) * 15.5 +
    estimateLines(data.instructions, 95) * 15.5 +
    Math.max(1, meds.length) * 23 + // renglones de medicamentos
    75; // firma
  const available = 842 - 26 - 42; // A4 alto − márgenes
  return estimated <= available ? 1 : Math.max(0.72, available / estimated);
}

export function RecetaPDF({
  data,
  logo,
  scale,
}: {
  data: RecetaData;
  logo?: Buffer | null;
  /** Sobrescribe la escala calculada (reintentos de la ruta). */
  scale?: number;
}) {
  const issuedAt = new Date();
  const age = ageFromBirthDate(data.pet.birthDate);
  const speciesLabel = SPECIES_LABEL[data.pet.species] ?? data.pet.species;
  const sexLabel = SEX_LABEL[data.pet.sex] ?? data.pet.sex;
  const weightStr =
    data.pet.weightKg != null ? `${data.pet.weightKg.toString()} kg` : null;

  const meds = parseMeds(data.medications);
  const k = scale ?? computeRecetaScale(data);
  const styles = makeStyles(k);

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
            <Field styles={styles} label="Paciente" value={data.pet.name} />
            <Field styles={styles} label="Especie" value={speciesLabel} />
            <Field styles={styles} label="Raza" value={data.pet.breed} />
            <Field styles={styles} label="Edad" value={age} />
            <Field styles={styles} label="Sexo" value={sexLabel} />
            <Field styles={styles} label="Peso" value={weightStr} />
            {data.pet.color ? (
              <Field styles={styles} label="Color" value={data.pet.color} />
            ) : null}
            {data.pet.microchipId ? (
              <Field styles={styles} label="Microchip" value={data.pet.microchipId} />
            ) : null}
            <Field styles={styles} label="Propietario" value={data.client.name} />
            <Field styles={styles} label="Teléfono" value={data.client.phone ?? null} />
            <Field styles={styles} label="Servicio" value={data.service.name} />
            <Field
              styles={styles}
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
