import { db } from "./db";
import {
  getResumenFinanciero,
  ordenarEstrategia,
  type MetodoPago,
  type ResumenFinanciero,
} from "./resumen";

// ---------------------------------------------------------------------------
// Asesor financiero IA.
// El proveedor de LLM se decide después: aquí solo definimos la INTERFAZ y el
// armado del prompt/contexto. Para enchufar Claude/OpenAI basta con
// implementar `LLMProvider` y registrarlo en `getProvider()`.
// ---------------------------------------------------------------------------

export interface LLMProvider {
  nombre: string;
  // Recibe instrucción de sistema + mensaje del usuario; devuelve texto.
  responder(system: string, prompt: string): Promise<string>;
}

// Modelo del tier gratuito de Gemini. Cambiar aquí si se migra de modelo.
// Nota: gemini-2.0-flash tenía cuota 0 en este proyecto; 2.5-flash sí tiene free tier.
const GEMINI_MODEL = "gemini-2.5-flash";

// Proveedor Gemini vía API REST (sin dependencias extra).
// Devuelve null si no hay GEMINI_API_KEY, para que el caller dé un error claro.
function getProvider(): LLMProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return {
    nombre: `gemini:${GEMINI_MODEL}`,
    async responder(system: string, prompt: string): Promise<string> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 3072,
            // 2.5-flash "piensa" antes de responder y eso consume tokens de salida;
            // lo desactivamos para que el presupuesto vaya íntegro a la respuesta.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      if (!res.ok) {
        const detalle = await res.text().catch(() => "");
        throw new Error(`Gemini respondió ${res.status}: ${detalle.slice(0, 300)}`);
      }
      const data = await res.json();
      const texto = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (!texto) throw new Error("Gemini no devolvió texto en la respuesta");
      return texto;
    },
  };
}

const SYSTEM_PROMPT = `Eres un asesor financiero personal para usuarios en Colombia.
Te entregan un resumen YA CALCULADO de las finanzas del usuario (en pesos colombianos salvo que se indique).
Reglas:
- NO inventes ni recalcules cifras: usa solo los números del resumen.
- Sé BREVE y directo: máximo unas 250 palabras. Usa viñetas cortas, no párrafos largos.
- Da 3 a 5 acciones concretas priorizadas (qué deuda pagar, dónde recortar, cuánto ahorrar).
- Explica el "por qué" en lenguaje simple, sin jerga.
- Cierra con una línea recordando que esto es orientación general, no asesoría financiera profesional.`;

export interface ConsejoContexto {
  resumen: ResumenFinanciero;
  estrategia_sugerida: ReturnType<typeof ordenarEstrategia>;
  pregunta_usuario?: string;
}

// Construye el contexto que se le pasa al modelo: snapshot + estrategia ya calculada.
export async function construirContexto(
  userId: string,
  metodo: MetodoPago = "avalancha",
  preguntaUsuario?: string
): Promise<ConsejoContexto> {
  const resumen = await getResumenFinanciero(userId);
  return {
    resumen,
    estrategia_sugerida: ordenarEstrategia(resumen.deudas.detalle, metodo),
    pregunta_usuario: preguntaUsuario,
  };
}

// Genera el consejo en lenguaje natural. Falla con mensaje claro si aún no hay proveedor.
export async function generarConsejo(ctx: ConsejoContexto): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      "No hay proveedor de IA configurado. Implementa LLMProvider en lib/asesor.ts y regístralo en getProvider()."
    );
  }
  const prompt = [
    "RESUMEN FINANCIERO DEL USUARIO:",
    JSON.stringify(ctx.resumen, null, 2),
    "",
    "ESTRATEGIA DE PAGO SUGERIDA (ya calculada):",
    JSON.stringify(ctx.estrategia_sugerida, null, 2),
    "",
    ctx.pregunta_usuario
      ? `PREGUNTA DEL USUARIO: ${ctx.pregunta_usuario}`
      : "Da un análisis general: gastos a recortar, qué deuda pagar primero y cuánto puede ahorrar al mes.",
  ].join("\n");
  return provider.responder(SYSTEM_PROMPT, prompt);
}

// ---------------------------------------------------------------------------
// Control de uso y plan (base de monetización).
// 'free' tiene un cupo mensual; 'premium' es ilimitado (con tope anti-abuso).
// ---------------------------------------------------------------------------

export const LIMITE_FREE_MENSUAL = 5; // consultas IA gratis al mes
export const LIMITE_PREMIUM_MENSUAL = 100; // tope anti-abuso para premium

export type Plan = "free" | "premium";

export interface EstadoUso {
  plan: Plan;
  periodo: string; // 'YYYY-MM'
  consultas_usadas: number;
  limite: number;
  restantes: number;
  puede_consultar: boolean;
}

function periodoActual(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function getPlan(userId: string): Promise<Plan> {
  const res = await db.execute({
    sql: "SELECT plan FROM users WHERE id = ?",
    args: [userId],
  });
  return res.rows[0]?.plan === "premium" ? "premium" : "free";
}

export async function getEstadoUso(userId: string): Promise<EstadoUso> {
  const plan = await getPlan(userId);
  const periodo = periodoActual();
  const res = await db.execute({
    sql: "SELECT consultas FROM ia_uso WHERE user_id = ? AND periodo = ?",
    args: [userId, periodo],
  });
  const usadas = Number(res.rows[0]?.consultas ?? 0);
  const limite = plan === "premium" ? LIMITE_PREMIUM_MENSUAL : LIMITE_FREE_MENSUAL;
  const restantes = Math.max(0, limite - usadas);
  return {
    plan,
    periodo,
    consultas_usadas: usadas,
    limite,
    restantes,
    puede_consultar: restantes > 0,
  };
}

// Suma una consulta al contador del periodo (upsert atómico).
export async function registrarConsulta(userId: string): Promise<void> {
  const periodo = periodoActual();
  await db.execute({
    sql: `INSERT INTO ia_uso (user_id, periodo, consultas, ultima_consulta)
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT (user_id, periodo)
          DO UPDATE SET consultas = consultas + 1, ultima_consulta = datetime('now')`,
    args: [userId, periodo],
  });
}
