/**
 * Fija la zona horaria del servidor a la de la clínica.
 *
 * En Vercel los servidores corren en UTC (6 h adelante de México), por lo
 * que todo cálculo de "hoy" (Mi día, calendario, disponibilidad) quedaba
 * desfasado respecto a lo que ve el usuario en su navegador. `register()`
 * corre una única vez al iniciar cada instancia del servidor, antes de
 * atender peticiones, así que toda operación con `Date` usa hora de México.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.CLINIC_TZ ?? "America/Mexico_City";
  }
}
