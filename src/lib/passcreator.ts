import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Integración con Passcreator (API v3) para los pases digitales de
// Apple/Google Wallet de los doctores afiliados.
//
// La plantilla (PASSCREATOR_TEMPLATE_ID) usa estos campos dinámicos:
//   First Name / Last Name → nombre del doctor
//   ID                     → walletToken (también va en el QR via barcodeValue)
//   storedValue            → saldo del monedero
// Al cambiar storedValue, los pases instalados se actualizan solos.

const BASE = "https://app.passcreator.com/api";

export function passcreatorEnabled() {
  return Boolean(
    process.env.PASSCREATOR_API_KEY && process.env.PASSCREATOR_TEMPLATE_ID
  );
}

async function pcFetch(path: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: process.env.PASSCREATOR_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    errors?: unknown;
    data?: Record<string, unknown>;
  } | null;
  if (!res.ok || !json?.success) {
    throw new Error(
      `Passcreator ${method} ${path} → HTTP ${res.status}: ${JSON.stringify(json?.errors ?? json)}`
    );
  }
  return json;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "-",
  };
}

interface PassData {
  name: string;
  balance: number;
  token: string;
  affiliateId: string;
}

// Crea el pase del doctor y devuelve { id, url } (o null si no está configurado)
export async function createAffiliatePass(data: PassData) {
  if (!passcreatorEnabled()) return null;

  const { firstName, lastName } = splitName(data.name);
  const res = await pcFetch("/v3/pass?async=false", "POST", {
    data: {
      templateId: process.env.PASSCREATOR_TEMPLATE_ID,
      barcodeValue: data.token,
      userProvidedId: data.affiliateId,
      storedValue: data.balance,
      "First Name": firstName,
      "Last Name": lastName,
      ID: data.token,
    },
  });
  const created = res.data as { identifier: string; downloadPage: string };
  return { id: created.identifier, url: created.downloadPage };
}

// Actualiza el saldo del pase instalado. Best-effort: nunca debe tumbar una
// venta o un pago si Passcreator falla.
export async function refreshAffiliatePass(affiliateId: string, pushText?: string) {
  if (!passcreatorEnabled()) return;

  try {
    const supabase = getSupabaseAdmin();
    const [{ data: user }, { data: txs }] = await Promise.all([
      supabase.from("User").select("passId").eq("id", affiliateId).single(),
      supabase.from("WalletTransaction").select("amount").eq("affiliateId", affiliateId),
    ]);
    if (!user?.passId) return;

    const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
    await pcFetch(`/v3/pass/${user.passId}`, "PATCH", {
      data: { storedValue: balance },
    });

    if (pushText) {
      // Push explícito, además del change message del propio pase
      await fetch(`${BASE}/pass/${user.passId}/sendpushnotification`, {
        method: "POST",
        headers: {
          Authorization: process.env.PASSCREATOR_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pushNotificationText: pushText }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[passcreator] no se pudo actualizar el pase:", err);
  }
}
