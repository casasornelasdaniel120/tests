"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { UserForm } from "./UserForm";
import type { Role } from "@/types";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  EDITOR: "Editor",
};

const ROLE_BADGE: Record<Role, "gold" | "rose" | "default"> = {
  ADMIN: "gold",
  CAJERO: "rose",
  EDITOR: "default",
};

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => setUsers(data));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    load();
  }

  function openEdit(user: User) {
    setEditing(user);
    setFormOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Usuarios</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo usuario
        </Button>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Nombre</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border last:border-0 hover:bg-bg-elevated transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-text-primary">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={ROLE_BADGE[user.role]}>
                    {ROLE_LABEL[user.role]}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={user.active ? "success" : "error"}>
                    {user.active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(user)}
                    >
                      <Power size={14} />
                      {user.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
      >
        <UserForm
          initial={editing}
          onSave={() => {
            setFormOpen(false);
            load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
