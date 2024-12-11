"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Copy, AlertCircle } from "lucide-react";

export function TwoFactorSetup() {
  const [step, setStep] = useState<'initial' | 'qr' | 'verify' | 'backup'>('initial');
  const [qrCode, setQrCode] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error);
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('qr');
    } catch (err) {
      setError('Error al iniciar la configuración');
    }
  };

  const verifyCode = async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error);
        return;
      }

      setBackupCodes(data.backupCodes);
      setStep('backup');
    } catch (err) {
      setError('Error al verificar el código');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Autenticación de dos factores</CardTitle>
        <CardDescription>
          {step === 'initial' && "Protege tu cuenta con autenticación de dos factores"}
          {step === 'qr' && "Escanea el código QR con tu aplicación de autenticación"}
          {step === 'verify' && "Ingresa el código de verificación"}
          {step === 'backup' && "Guarda estos códigos de respaldo en un lugar seguro"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'initial' && (
          <Button onClick={startSetup} className="w-full">
            Configurar 2FA
          </Button>
        )}

        {step === 'qr' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Image
                src={qrCode!}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                value={secret}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copySecret}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <Button
              onClick={() => setStep('verify')}
              className="w-full"
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Código de verificación"
              maxLength={6}
            />
            <Button
              onClick={verifyCode}
              className="w-full"
              disabled={verificationCode.length !== 6}
            >
              Verificar
            </Button>
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="p-2 bg-muted rounded font-mono text-center"
                >
                  {code}
                </div>
              ))}
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Finalizar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}