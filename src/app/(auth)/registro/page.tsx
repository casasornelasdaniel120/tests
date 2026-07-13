"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegistroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la cuenta");
        return;
      }

      // Cuenta creada: inicia sesión y va directo a su monedero
      await signIn("credentials", { email, password, redirect: false });
      router.push("/monedero");
    } catch {
      setError("No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cta/10 border border-cta/30 flex items-center justify-center mb-4">
            <Stethoscope className="text-cta" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Programa de afiliados
          </h1>
          <p className="text-sm text-text-secondary mt-1 text-center">
            Crea tu cuenta de doctor y gana comisiones por cada cliente que
            venga de tu parte
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-surface border border-border rounded-2xl p-5 sm:p-8 shadow-xl flex flex-col gap-5"
        >
          <Input
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Juan Pérez"
            required
            autoFocus
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clinica.mx"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <Button type="submit" variant="cta" size="lg" loading={loading} className="w-full mt-1">
            Crear mi cuenta
          </Button>
        </form>

        <p className="text-center text-xs text-text-secondary mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-cta hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
