import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);

export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
    };
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get("token")?.value ?? null;
}
