import { verifyTOTP } from '@/lib/auth/totp';

export async function POST(request: Request) {
  const { tempToken, code } = await request.json();
  
  const userId = verifyTempToken(tempToken);
  if (!userId) {
    return NextResponse.json(
      { error: "Token temporal inválido" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { twoFactorAuth: true }
  });

  if (!user?.twoFactorAuth?.secret) {
    return NextResponse.json(
      { error: "2FA no configurado" },
      { status: 400 }
    );
  }

  const isValidCode = verifyTOTP(code, user.twoFactorAuth.secret);
  if (!isValidCode) {
    return NextResponse.json(
      { error: "Código inválido" },
      { status: 401 }
    );
  }

  const { accessToken, refreshToken } = await generateTokens(user);
  
  const response = NextResponse.json({ success: true, accessToken });
  response.cookies.set({
    name: 'refresh_token',
    value: refreshToken,
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  return response;
}