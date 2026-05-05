import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";

export default async function Home() {
  const session = await readSession();
  if (session) {
    if (session.role === "VET") redirect("/vet");
    if (session.role === "ADMIN") redirect("/admin");
    redirect("/inicio");
  }
  redirect("/login");
}
