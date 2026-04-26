import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-insecure-secret-change-in-production-please"
);

const CLIENT_PREFIXES = ["/inicio", "/agendar", "/mascotas", "/perfil", "/cita"];
const VET_PREFIXES = ["/vet"];
const ADMIN_PREFIXES = ["/admin"];

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("vet_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth =
    CLIENT_PREFIXES.some((p) => pathname.startsWith(p)) ||
    VET_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (!needsAuth) return NextResponse.next();

  const role = await getRole(req);
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (VET_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "VET" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
