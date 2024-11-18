import { LoginForm } from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | PinteYa Admin",
  description: "Accede al panel de administración",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">PinteYa Admin</h1>
          <p className="text-muted-foreground">Accede a tu cuenta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}