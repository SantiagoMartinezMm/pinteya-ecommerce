import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { RateLimiter } from '@/lib/services/rate-limiter';
import { generateTokens } from '@/lib/auth/tokens';
import { createCSRFToken } from '@/lib/auth/csrf';

export async function POST(request: Request) {
  const rateLimiter = new RateLimiter();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!await rateLimiter.checkRateLimit(`login:${ip}`)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intente más tarde." },
      { status: 429 }
    );
  }

  const { email, password } = await request.json();
  
  // Validar CSRF token
  const csrfToken = request.headers.get('x-csrf-token');
  if (!validateCSRFToken(csrfToken)) {
    return NextResponse.json(
      { error: "Token CSRF inválido" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { twoFactorAuth: true }
  });

  if (!user || !await bcrypt.compare(password, user.hashedPassword)) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  // Si 2FA está habilitado, requerir código
  if (user.twoFactorAuth?.enabled) {
    return NextResponse.json({
      requiresTwoFactor: true,
      tempToken: generateTempToken(user.id)
    });
  }

  const { accessToken, refreshToken } = await generateTokens(user);
  const newCsrfToken = await createCSRFToken();
  const response = NextResponse.json({
    success: true,
    accessToken
  });

  // Configurar cookies seguras
  response.cookies.set({
    name: 'refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 días
  });

  response.headers.set('x-csrf-token', newCsrfToken);

  return response;
}