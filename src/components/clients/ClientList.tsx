"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClientForm } from "./ClientForm";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const load = useCallback(() => {
    fetch(`/api/clients?search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data: Client[]) => setClients(data));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function handleDelete(client: Client) {
    if (!confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo cliente
        </Button>
      </div>

      <Input
        placeholder="Buscar por nombre, teléfono o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={16} />}
        className="mb-6 max-w-md"
      />

      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-16 text-center text-text-secondary">
            No hay clientes registrados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary">Email</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-border last:border-0 hover:bg-bg-elevated transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {client.phone ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {client.email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditing(client); setFormOpen(true); }}
                        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-gold transition-colors"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <Link
                        href={`/clientes/${client.id}`}
                        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-gold transition-colors"
                      >
                        Ver ficha <ChevronRight size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(client)}
                        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
      >
        <ClientForm
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
