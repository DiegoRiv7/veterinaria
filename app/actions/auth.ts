"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  signSession,
  verifyPassword,
} from "@/lib/auth";

function normalizePhone(raw: string) {
  return raw.replace(/\D+/g, "");
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Revisa tu correo y contraseña." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No encontramos esa cuenta." };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "La contraseña no coincide." };
  const token = await signSession({ userId: user.id, role: user.role, name: user.name });
  await setSessionCookie(token);
  redirectByRole(user.role);
}

export async function signupAction(
  _: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const petName = String(formData.get("petName") ?? "").trim();
  const petSpecies = String(formData.get("petSpecies") ?? "DOG");
  if (!name) return { error: "Falta tu nombre." };
  if (!EMAIL_RE.test(email)) return { error: "El correo no es válido." };
  if (phone.length < 7) return { error: "Ingresa un teléfono de 10 dígitos." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  const [byEmail, byPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
  ]);
  if (byEmail) return { error: "Ya existe una cuenta con ese correo." };
  if (byPhone) return { error: "Ya existe una cuenta con ese teléfono." };

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      phone,
      name,
      passwordHash,
      role: "CLIENT",
      pets: petName
        ? {
            create: {
              name: petName,
              species: petSpecies as
                | "DOG"
                | "CAT"
                | "BIRD"
                | "RABBIT"
                | "HAMSTER"
                | "REPTILE"
                | "OTHER",
            },
          }
        : undefined,
    },
  });
  const token = await signSession({ userId: user.id, role: user.role, name: user.name });
  await setSessionCookie(token);
  redirect("/inicio");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

function redirectByRole(role: "CLIENT" | "VET" | "ADMIN"): never {
  if (role === "VET") redirect("/vet");
  if (role === "ADMIN") redirect("/admin");
  redirect("/inicio");
}
