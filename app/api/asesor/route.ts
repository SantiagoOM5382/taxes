import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  construirContexto,
  generarConsejo,
  getEstadoUso,
  registrarConsulta,
} from "@/lib/asesor";
import type { MetodoPago } from "@/lib/resumen";

// GET: estado de uso del usuario (plan, consultas restantes) para pintar la UI.
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ uso: await getEstadoUso(user.id) });
}

// POST: genera un consejo. Respeta el límite del plan antes de gastar una llamada.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const uso = await getEstadoUso(user.id);
  if (!uso.puede_consultar) {
    return NextResponse.json(
      {
        error: `Llegaste al límite de ${uso.limite} consultas de este mes en tu plan ${uso.plan}.`,
        uso,
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const metodo: MetodoPago = body?.metodo === "bola_nieve" ? "bola_nieve" : "avalancha";
  const pregunta = typeof body?.pregunta === "string" ? body.pregunta.slice(0, 500) : undefined;

  try {
    const ctx = await construirContexto(user.id, metodo, pregunta);
    const consejo = await generarConsejo(ctx);
    await registrarConsulta(user.id);
    return NextResponse.json({
      consejo,
      estrategia: ctx.estrategia_sugerida,
      uso: await getEstadoUso(user.id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando el consejo";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
