// Tasa de cambio USD → COP con caché de 1 hora (API gratuita, sin key).
// Devuelve null si el servicio no responde; el front muestra el USD por separado.
export async function getTasaUSDCOP(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tasa = Number(data?.rates?.COP);
    return Number.isFinite(tasa) && tasa > 0 ? tasa : null;
  } catch {
    return null;
  }
}
