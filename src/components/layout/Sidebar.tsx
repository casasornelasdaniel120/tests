"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Camera,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  UserCog,
  LogOut,
  Leaf,
  Stethoscope,
  Wallet,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/pos", label: "Cobrar", icon: ShoppingCart, roles: ["ADMIN", "CAJERO"] },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ["ADMIN", "EDITOR"] },
  { href: "/productos", label: "Productos", icon: Package, roles: ["ADMIN", "EDITOR"] },
  { href: "/caja", label: "Caja", icon: BarChart3, roles: ["ADMIN", "CAJERO"] },
  { href: "/canje", label: "Canje", icon: QrCode, roles: ["ADMIN", "CAJERO"] },
  { href: "/afiliados", label: "Afiliados", icon: Stethoscope, roles: ["ADMIN"] },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["ADMIN"] },
  { href: "/monedero", label: "Mi monedero", icon: Wallet, roles: ["AFILIADO"] },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  const allowed = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-60 shrink-0 h-full bg-bg-surface border-r border-border flex-col shadow-sm">
        {/* Brand */}
        <div className="relative flex items-center gap-3 px-5 py-5 border-b border-border overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gold/5 pointer-events-none" />
          <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-cta/5 pointer-events-none" />
          <div className="w-9 h-9 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <Camera className="text-gold" size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-text-primary leading-none">
                Foto POS
              </p>
              <Leaf size={11} className="text-gold opacity-50" />
            </div>
            <p className="text-xs text-text-secondary mt-0.5 capitalize">
              {role.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {allowed.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-gold/10 text-gold border border-gold/20 shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-base"
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-text-primary truncate">{userName}</p>
            <p className="text-xs text-text-secondary capitalize">{role.toLowerCase()}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav (< lg) ── */}
      {/* overflow-x-auto: con muchos items (p. ej. ADMIN) la barra se desplaza en vez de encimarse */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border flex items-center justify-start sm:justify-around gap-1 px-1 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] overflow-x-auto">
        {allowed.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-medium transition-all shrink-0 min-w-[56px] flex-1",
                active ? "text-gold" : "text-text-secondary"
              )}
            >
              <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="truncate max-w-[72px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-medium text-text-secondary transition-all cursor-pointer shrink-0 min-w-[56px] flex-1"
        >
          <LogOut size={20} strokeWidth={1.8} />
          <span>Salir</span>
        </button>
      </nav>
    </>
  );
}
