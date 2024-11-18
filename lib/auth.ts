import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function getSession() {
  const token = cookies().get("session")?.value;
  
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function validateRequest(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return {
      success: false,
      redirect: "/login",
    };
  }

  return {
    success: true,
    session,
  };
}

export async function requireAdmin() {
  const session = await getSession();
  
  if (!session || session.role !== "admin") {
    throw new Error("Acceso no autorizado");
  }
  
  return session;
}