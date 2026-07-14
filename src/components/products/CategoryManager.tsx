"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CategoryManagerProps {
  // Se dispara tras cualquier cambio (los renombres cascadean a productos)
  onChanged: () => void;
}

export function CategoryManager({ onChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: { name: string }[]) => setCategories(data.map((c) => c.name)));
  }, []);

  useEffect(load, [load]);

  async function request(url: string, init: RequestInit): Promise<boolean> {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Error" }));
        setError((data as { error?: string }).error ?? "Error");
        return false;
      }
      load();
      onChanged();
      return true;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await request("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });
    if (ok) setNewName("");
  }

  async function handleRename(current: string) {
    if (!editValue.trim() || editValue.trim() === current) {
      setEditing(null);
      return;
    }
    const ok = await request(`/api/categories/${encodeURIComponent(current)}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editValue }),
    });
    if (ok) setEditing(null);
  }

  async function handleDelete(name: string) {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    await request(`/api/categories/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Nueva categoría…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
          />
        </div>
        <Button type="submit" loading={loading} disabled={!newName.trim()}>
          <Plus size={16} />
          Agregar
        </Button>
      </form>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <ul className="flex flex-col divide-y divide-border border border-border rounded-xl overflow-hidden">
        {categories.map((cat) => (
          <li key={cat} className="flex items-center gap-2 px-3 py-2 bg-bg-surface">
            {editing === cat ? (
              <>
                <div className="flex-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    maxLength={40}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRename(cat);
                      }
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRename(cat)}>
                  <Check size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  <X size={14} />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-text-primary">{cat}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(cat);
                    setEditValue(cat);
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cat)}
                  className="hover:text-red-400"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-text-secondary">
            No hay categorías.
          </li>
        )}
      </ul>

      <p className="text-xs text-text-secondary">
        Al renombrar una categoría, los productos que la usan se actualizan
        automáticamente. Solo se pueden eliminar categorías sin productos.
      </p>
    </div>
  );
}
