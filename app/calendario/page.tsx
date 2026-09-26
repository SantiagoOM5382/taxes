import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CalendarioVista from "@/components/CalendarioVista";

export const metadata = { title: "Calendario" };

// Envoltorio de servidor: sin sesión manda al login en vez de mostrar un error de carga
export default async function CalendarioPage() {
  if (!(await getSession())) redirect("/login");
  return <CalendarioVista />;
}
