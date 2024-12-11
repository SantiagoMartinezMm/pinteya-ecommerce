import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export class TwoFactorAuth {
  async setupTwoFactor(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const secret = authenticator.generateSecret();
    const appName = 'PinteYa';
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    const otpauth = authenticator.keyuri(
      user!.email,
      appName,
      secret
    );

    const qrCode = await QRCode.toDataURL(otpauth);
    const backupCodes = Array.from({ length: 10 }, () => 
      authenticator.generateSecret().slice(0, 8)
    );

    // Guardar en base de datos
    await prisma.twoFactorAuth.create({
      data: {
        userId,
        secret,
        backupCodes: backupCodes.map(code => ({
          code: await bcrypt.hash(code, 12),
          used: false
        })),
        enabled: false
      }
    });

    return {
      secret,
      qrCode,
      backupCodes
    };
  }

  async verifyTwoFactor(
    userId: string,
    token: string,
    useBackup: boolean = false
  ): Promise<boolean> {
    const twoFactorData = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    if (!twoFactorData) return false;

    if (useBackup) {
      const backupCode = twoFactorData.backupCodes.find(
        bc => !bc.used && bcrypt.compareSync(token, bc.code)
      );

      if (backupCode) {
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: {
            backupCodes: twoFactorData.backupCodes.map(bc =>
              bc === backupCode ? { ...bc, used: true } : bc
            )
          }
        });
        return true;
      }
      return false;
    }

    return authenticator.verify({
      token,
      secret: twoFactorData.secret
    });
  }

  async disableTwoFactor(userId: string, token: string): Promise<boolean> {
    const isValid = await this.verifyTwoFactor(userId, token);
    if (!isValid) return false;

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: false }
    });

    return true;
  }
}