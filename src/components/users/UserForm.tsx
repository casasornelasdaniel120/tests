"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "CAJERO", label: "Cajero" },
  { value: "EDITOR", label: "Editor" },
  { value: "AFILIADO", label: "Afiliado (doctor)" },
];

interface UserData {
  id?: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

interface UserFormProps {
  initial: UserData | null;
  onSave: () => void;
  onCancel: () => void;
}

export function UserForm({ initial, onSave, onCancel }: UserFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initial?.role ?? "CAJERO");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initial && !password) return;
    setLoading(true);

    const payload: Record<string, unknown> = { name, email, role };
    if (password) payload.password = password;

    const url = initial?.id ? `/api/users/${initial.id}` : "/api/users";
    const method = initial?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />
      <Input
        label="Email *"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label={initial ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required={!initial}
        placeholder="••••••••"
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Rol</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="h-10 bg-bg-elevated border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-gold/60"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {initial ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}
