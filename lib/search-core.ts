/**
 * Núcleo del buscador global (Spotlight) del panel veterinario.
 *
 * Diseñado para ser EXTREMADAMENTE tolerante:
 * - ignora mayúsculas, acentos y espacios de más
 * - tolera errores de dedo (distancia de edición 1-2 según el largo)
 * - entiende teléfonos (solo dígitos, aunque escriban con espacios/guiones)
 * - entiende correos y fragmentos de texto en cualquier campo
 *
 * Todo es puro (sin dependencias de servidor) para poder probarlo aislado.
 */

/** minúsculas + sin acentos + espacios colapsados */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function digitsOf(s: string): string {
  return s.replace(/\D+/g, "");
}

/**
 * Distancia Damerau-Levenshtein con tope (early exit). Suficiente para
 * palabras de formularios; no se usa en textos largos completos, solo
 * token contra token.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  // matriz de (la+1) x (lb+1) en dos/tres filas
  let prevPrev: number[] = [];
  let prev: number[] = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(
        prev[j] + 1, // borrado
        cur[j - 1] + 1, // inserción
        prev[j - 1] + cost // sustitución
      );
      // transposición (Damerau)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1; // ya no puede bajar del tope
    prevPrev = prev;
    prev = cur;
  }
  return prev[lb];
}

/** Tolerancia de errores según el largo del token buscado. */
export function maxTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

export type Candidate = {
  /** Texto buscable ya normalizado (campos concatenados). */
  haystack: string;
  /** Dígitos de teléfonos/identificadores del candidato. */
  digits?: string;
};

export type MatchResult = {
  score: number;
  /** true si SOLO hubo coincidencias difusas → "¿Buscabas…?" */
  fuzzyOnly: boolean;
};

/**
 * Prepara la consulta una vez (normaliza, separa tokens, extrae dígitos).
 */
export function prepareQuery(raw: string) {
  const norm = normalizeText(raw);
  const tokens = norm.split(" ").filter(Boolean);
  const digits = digitsOf(raw);
  return { norm, tokens, digits };
}

/**
 * Evalúa un candidato contra la consulta preparada. Devuelve null si no
 * hay coincidencia razonable. Semántica AND: cada token de la consulta
 * debe encontrar acomodo en el candidato.
 */
export function matchCandidate(
  q: ReturnType<typeof prepareQuery>,
  c: Candidate
): MatchResult | null {
  // Teléfonos / números: si la consulta trae 4+ dígitos y el candidato
  // los contiene en secuencia, es coincidencia fuerte.
  if (q.digits.length >= 4 && c.digits && c.digits.includes(q.digits)) {
    return { score: 92, fuzzyOnly: false };
  }

  if (q.tokens.length === 0) return null;
  const hayTokens = c.haystack.split(" ").filter(Boolean);

  let total = 0;
  let fuzzyOnly = true;
  for (const tok of q.tokens) {
    let best = 0;
    let bestWasFuzzy = false;
    // subcadena contigua en todo el texto (cubre correos y compuestos)
    if (c.haystack.includes(tok)) {
      best = 62;
      bestWasFuzzy = false;
    }
    for (const ht of hayTokens) {
      if (ht === tok) {
        best = Math.max(best, 100);
        bestWasFuzzy = false;
      } else if (ht.startsWith(tok)) {
        if (82 > best) {
          best = 82;
          bestWasFuzzy = false;
        }
      } else {
        const cap = maxTypos(tok.length);
        if (cap > 0 && best < 50) {
          const d = editDistance(tok, ht, cap);
          if (d <= cap) {
            const fuzzyScore = d === 1 ? 48 : 34;
            if (fuzzyScore > best) {
              best = fuzzyScore;
              bestWasFuzzy = true;
            }
          } else if (tok.length >= 5 && ht.length > tok.length) {
            // typo dentro de un prefijo ("coneji" vs "conejito")
            const dPrefix = editDistance(tok, ht.slice(0, tok.length), 1);
            if (dPrefix <= 1 && 42 > best) {
              best = 42;
              bestWasFuzzy = true;
            }
          }
        }
      }
      if (best >= 100) break;
    }
    if (best === 0) return null; // un token sin acomodo → fuera
    if (!bestWasFuzzy) fuzzyOnly = false;
    total += best;
  }

  let score = total / q.tokens.length;
  // bonos por coincidencia contigua / inicio
  if (c.haystack.startsWith(q.norm)) score += 22;
  else if (c.haystack.includes(q.norm)) score += 12;

  return { score, fuzzyOnly };
}

/** Umbral mínimo para considerar que algo es un resultado. */
export const MIN_SCORE = 33;
