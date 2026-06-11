// Tasas de cambio a COP con caché de 1 hora (API gratuita, sin key).
// Devuelve null por moneda si el servicio no responde; el front muestra esa moneda por separado.
export interface TasasCOP {
  usd: number | null; // 1 USD en COP
  eur: number | null; // 1 EUR en COP
}

export async function getTasasCOP(): Promise<TasasCOP> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { usd: null, eur: null };
    const data = await res.json();
    const cop = Number(data?.rates?.COP);
    const eurPorUsd = Number(data?.rates?.EUR); // EUR que vale 1 USD
    const usd = Number.isFinite(cop) && cop > 0 ? cop : null;
    const eur =
      usd != null && Number.isFinite(eurPorUsd) && eurPorUsd > 0 ? usd / eurPorUsd : null;
    return { usd, eur };
  } catch {
    return { usd: null, eur: null };
  }
}
