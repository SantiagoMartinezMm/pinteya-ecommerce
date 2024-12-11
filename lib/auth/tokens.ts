import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

export async function generateTokens(user: User) {
  const accessToken = await new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setJti(nanoid())
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  const refreshToken = await new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setJti(nanoid())
    .sign(new TextEncoder().encode(process.env.JWT_REFRESH_SECRET));

  // Guardar refresh token en base de datos
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return { accessToken, refreshToken };
}