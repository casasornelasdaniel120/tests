import type { Role } from "@/types";

// Página de inicio según el rol; usada por guards y por el login
export function homeFor(role?: Role): string {
  switch (role) {
    case "EDITOR":
      return "/clientes";
    case "AFILIADO":
      return "/monedero";
    default:
      return "/pos";
  }
}
