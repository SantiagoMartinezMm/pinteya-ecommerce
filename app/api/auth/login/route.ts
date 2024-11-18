import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("Intento de login con:", email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.hashedPassword || !await bcrypt.compare(password, user.hashedPassword)) {
      console.log("Credenciales inválidas");
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    console.log("Login exitoso");

    const response = NextResponse.json({
      success: true,
      message: "Login exitoso"
    });

    response.cookies.set({
      name: 'session',
      value: 'authenticated',
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}