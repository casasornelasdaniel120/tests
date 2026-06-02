"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ClientSearchProps {
  onSelect: (client: { id: string; name: string }) => void;
  onClose: () => void;
}

export function ClientSearch({ onSelect, onClose }: ClientSearchProps) {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.length < 1) { setClients([]); return; }
      setLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((data: Client[]) => setClients(data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, phone: newPhone || undefined }),
    });
    if (res.ok) {
      const client = await res.json() as Client;
      onSelect({ id: client.id, name: client.name });
    }
  }

  return (
    <Modal open title="Buscar cliente" onClose={onClose} size="md">
      {!creating ? (
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Nombre, teléfono o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            autoFocus
          />

          {loading && (
            <p className="text-sm text-text-secondary text-center">Buscando…</p>
          )}

          {clients.length > 0 && (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect({ id: c.id, name: c.name })}
                  className="flex flex-col items-start px-4 py-3 rounded-xl hover:bg-bg-elevated transition-colors text-left"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {c.name}
                  </span>
                  {(c.phone ?? c.email) && (
                    <span className="text-xs text-text-secondary">
                      {c.phone ?? c.email}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {search.length > 0 && clients.length === 0 && !loading && (
            <p className="text-sm text-text-secondary text-center">
              No se encontraron clientes.
            </p>
          )}

          <Button
            variant="secondary"
            onClick={() => setCreating(true)}
            className="w-full"
          >
            <Plus size={16} />
            Crear cliente nuevo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setCreating(false)} className="text-text-secondary hover:text-text-primary">
              <X size={18} />
            </button>
            <h3 className="text-sm font-semibold text-text-primary">Nuevo cliente</h3>
          </div>
          <Input
            label="Nombre *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre completo"
            autoFocus
          />
          <Input
            label="Teléfono"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="55 1234 5678"
          />
          <Button onClick={handleCreate} disabled={!newName.trim()}>
            Guardar y seleccionar
          </Button>
        </div>
      )}
    </Modal>
  );
}
