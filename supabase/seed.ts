import { createClient } from "@supabase/supabase-js";
import { createId } from "@paralleldrive/cuid2";
import type { Role, PaymentMethod, InsumoType } from "../src/types";

// Corre con: npm run db:seed (tsx --env-file=.env supabase/seed.ts)
// Para sembrar la nube: apunta las vars de entorno al proyecto remoto.
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_USERS: { name: string; email: string; password: string; role: Role; commissionPct: number }[] = [
  { name: "Ana García", email: "admin@fotostudio.mx", password: "admin123", role: "ADMIN", commissionPct: 0 },
  { name: "Luis Martínez", email: "cajero@fotostudio.mx", password: "cajero123", role: "CAJERO", commissionPct: 0 },
  { name: "Sofía Ruiz", email: "editor@fotostudio.mx", password: "editor123", role: "EDITOR", commissionPct: 0 },
  { name: "Dr. Ramón García", email: "dr.garcia@dental.mx", password: "doctor123", role: "AFILIADO", commissionPct: 10 },
];

// Las credenciales viven en Supabase Auth; la tabla User solo guarda perfil/rol
async function seedUsers(): Promise<Record<string, string>> {
  for (const u of DEMO_USERS) {
    const { error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role },
    });
    if (error && !/already.*(registered|exists)/i.test(error.message)) {
      throw new Error(`Auth user ${u.email}: ${error.message}`);
    }
  }

  // Perfil en la tabla User (id = id del usuario en Supabase Auth)
  const { data: authList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  for (const u of DEMO_USERS) {
    const authUser = authList.users.find((a) => a.email === u.email);
    if (!authUser) throw new Error(`No se encontró en Auth: ${u.email}`);
    const { error } = await supabase.from("User").upsert(
      {
        id: authUser.id,
        name: u.name,
        email: u.email,
        role: u.role,
        commissionPct: u.commissionPct,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "email", ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  const { data: profiles, error: profErr } = await supabase.from("User").select("id, email");
  if (profErr) throw profErr;
  return Object.fromEntries(profiles.map((p) => [p.email, p.id]));
}

const CATEGORIES = ["Retrato", "Corporativo", "Quinceañera", "Familia", "Bebé", "Otro"];

const PRODUCTS = [
  { id: "prod_retrato_basico", name: "Retrato Básico", description: "Sesión de 30 min, 1 fondo, 5 fotos editadas en digital", price: 800, category: "Retrato" },
  { id: "prod_retrato_premium", name: "Retrato Premium", description: "Sesión de 1 hora, 3 fondos, 15 fotos editadas + álbum impreso", price: 2200, category: "Retrato" },
  { id: "prod_corporativo", name: "Foto Corporativa", description: "Headshot profesional, fondo blanco/gris, 3 versiones editadas", price: 650, category: "Corporativo" },
  { id: "prod_quince", name: "Paquete Quinceañera", description: "Sesión completa 3 horas, múltiples cambios de vestido, 40 fotos editadas + álbum", price: 5500, category: "Quinceañera" },
  { id: "prod_familia", name: "Sesión Familiar", description: "Hasta 6 personas, 2 horas, 20 fotos editadas en digital", price: 1800, category: "Familia" },
  { id: "prod_bebe", name: "Sesión Bebé / Newborn", description: "Sesión especializada para bebés 0-3 meses, atrezzo incluido, 10 fotos", price: 1500, category: "Bebé" },
];

const CLIENTS = [
  { id: "cli_1", name: "María López", phone: "5551234567", email: "maria.lopez@gmail.com", notes: "Cliente frecuente, prefiere fondos claros" },
  { id: "cli_2", name: "Carlos Hernández", phone: "5559876543", email: "carlos.h@empresa.com", notes: null },
  { id: "cli_3", name: "Familia Rodríguez", phone: "5554567890", email: null, notes: "Sesión anual de familia, 4 integrantes" },
  { id: "cli_4", name: "Valentina Torres", phone: "5558765432", email: "valen.torres@hotmail.com", notes: "Quinceañera programada para diciembre" },
  { id: "cli_5", name: "Roberto Sánchez", phone: "5552345678", email: "r.sanchez@corporativo.mx", notes: null },
];

// Insumos demo: materiales inventariados (costo = promedio ponderado de
// compras) y mano de obra (tarifa manual, sin stock)
const INSUMOS: { id: string; name: string; type: InsumoType; unit: string; currentCost: number; stock: number; minStock: number }[] = [
  { id: "ins_placa", name: "Placa radiográfica", type: "MATERIAL", unit: "pieza", currentCost: 45, stock: 20, minStock: 10 },
  { id: "ins_guantes", name: "Guantes de látex", type: "MATERIAL", unit: "pieza", currentCost: 3, stock: 100, minStock: 30 },
  { id: "ins_papel", name: "Papel fotográfico", type: "MATERIAL", unit: "hoja", currentCost: 12, stock: 50, minStock: 20 },
  { id: "ins_album", name: "Álbum impreso", type: "MATERIAL", unit: "pieza", currentCost: 350, stock: 8, minStock: 3 },
  { id: "ins_hora_dr", name: "Hora de doctor", type: "MANO_DE_OBRA", unit: "hora", currentCost: 300, stock: 0, minStock: 0 },
  { id: "ins_hora_asist", name: "Hora de asistente", type: "MANO_DE_OBRA", unit: "hora", currentCost: 80, stock: 0, minStock: 0 },
];

// Recetas (BOM): insumos que consume cada producto vendido
const RECIPES: { productId: string; insumoId: string; quantity: number }[] = [
  { productId: "prod_retrato_basico", insumoId: "ins_placa", quantity: 1 },
  { productId: "prod_retrato_basico", insumoId: "ins_guantes", quantity: 3 },
  { productId: "prod_retrato_basico", insumoId: "ins_hora_dr", quantity: 0.5 },
  { productId: "prod_retrato_basico", insumoId: "ins_hora_asist", quantity: 1 },
  { productId: "prod_retrato_premium", insumoId: "ins_placa", quantity: 2 },
  { productId: "prod_retrato_premium", insumoId: "ins_papel", quantity: 15 },
  { productId: "prod_retrato_premium", insumoId: "ins_album", quantity: 1 },
  { productId: "prod_retrato_premium", insumoId: "ins_hora_dr", quantity: 1 },
  { productId: "prod_retrato_premium", insumoId: "ins_hora_asist", quantity: 1.5 },
];

async function seedFinance(userIdByEmail: Record<string, string>) {
  const now = new Date().toISOString();
  const { error: insError } = await supabase.from("Insumo").upsert(
    INSUMOS.map((i) => ({ ...i, active: true, updatedAt: now })),
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (insError) throw insError;
  console.log("✓ Insumos creados");

  const { error: recError } = await supabase.from("ProductInsumo").upsert(
    RECIPES.map((r) => ({ id: `rec_${r.productId}_${r.insumoId}`, ...r })),
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (recError) throw recError;
  console.log("✓ Recetas creadas");

  // Compra demo que respalda el stock/costo inicial de los materiales
  const { count } = await supabase.from("Purchase").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("↷ Compras omitidas (ya existen)");
    return;
  }
  const purchaseId = createId();
  const materials = INSUMOS.filter((i) => i.type === "MATERIAL");
  const total = materials.reduce((sum, i) => sum + i.stock * i.currentCost, 0);
  const { error: purError } = await supabase.from("Purchase").insert({
    id: purchaseId,
    userId: userIdByEmail["admin@fotostudio.mx"],
    supplier: "Proveedora Dental del Centro",
    notes: "Compra inicial de inventario",
    total,
  });
  if (purError) throw purError;
  const { error: purItemsError } = await supabase.from("PurchaseItem").insert(
    materials.map((i) => ({
      id: createId(),
      purchaseId,
      insumoId: i.id,
      quantity: i.stock,
      unitCost: i.currentCost,
      subtotal: i.stock * i.currentCost,
    }))
  );
  if (purItemsError) throw purItemsError;
  console.log("✓ Compra inicial creada");
}

async function main() {
  const userIdByEmail = await seedUsers();
  console.log("✓ Usuarios creados (Supabase Auth + perfil)");

  const { error: catError } = await supabase.from("Category").upsert(
    CATEGORIES.map((name) => ({ name })),
    { onConflict: "name", ignoreDuplicates: true }
  );
  if (catError) throw catError;
  console.log("✓ Categorías creadas");

  const now = new Date().toISOString();
  const { error: prodError } = await supabase.from("Product").upsert(
    PRODUCTS.map((p) => ({ ...p, active: true, updatedAt: now })),
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (prodError) throw prodError;
  console.log("✓ Productos creados");

  const { error: cliError } = await supabase.from("Client").upsert(
    CLIENTS.map((c) => ({ ...c, updatedAt: now })),
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (cliError) throw cliError;
  console.log("✓ Clientes creados");

  // Ventas de ejemplo — solo si aún no hay ninguna (el seed es re-ejecutable)
  const { count } = await supabase.from("Sale").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("↷ Ventas omitidas (ya existen)");
  } else {
    const admin = userIdByEmail["admin@fotostudio.mx"];
    const cajero = userIdByEmail["cajero@fotostudio.mx"];
    const salesData: { userId: string; clientId: string; productId: string; quantity: number; discount: number; paymentMethod: PaymentMethod; daysAgo: number }[] = [
      { userId: admin, clientId: "cli_1", productId: "prod_retrato_basico", quantity: 1, discount: 0, paymentMethod: "EFECTIVO", daysAgo: 1 },
      { userId: cajero, clientId: "cli_2", productId: "prod_corporativo", quantity: 2, discount: 100, paymentMethod: "TARJETA", daysAgo: 1 },
      { userId: admin, clientId: "cli_3", productId: "prod_familia", quantity: 1, discount: 0, paymentMethod: "TRANSFERENCIA", daysAgo: 2 },
      { userId: cajero, clientId: "cli_4", productId: "prod_quince", quantity: 1, discount: 500, paymentMethod: "EFECTIVO", daysAgo: 3 },
      { userId: admin, clientId: "cli_5", productId: "prod_retrato_premium", quantity: 1, discount: 0, paymentMethod: "TARJETA", daysAgo: 4 },
      { userId: cajero, clientId: "cli_1", productId: "prod_bebe", quantity: 1, discount: 0, paymentMethod: "EFECTIVO", daysAgo: 5 },
      { userId: admin, clientId: "cli_2", productId: "prod_corporativo", quantity: 3, discount: 0, paymentMethod: "TRANSFERENCIA", daysAgo: 6 },
      { userId: cajero, clientId: "cli_3", productId: "prod_retrato_basico", quantity: 1, discount: 100, paymentMethod: "EFECTIVO", daysAgo: 7 },
      { userId: admin, clientId: "cli_4", productId: "prod_familia", quantity: 1, discount: 0, paymentMethod: "TARJETA", daysAgo: 8 },
      { userId: cajero, clientId: "cli_5", productId: "prod_retrato_premium", quantity: 1, discount: 200, paymentMethod: "EFECTIVO", daysAgo: 10 },
    ];

    for (const data of salesData) {
      const product = PRODUCTS.find((p) => p.id === data.productId)!;
      const itemSubtotal = product.price * data.quantity - data.discount;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - data.daysAgo);
      const saleId = createId();

      const { error: saleError } = await supabase.from("Sale").insert({
        id: saleId,
        userId: data.userId,
        clientId: data.clientId,
        subtotal: product.price * data.quantity,
        discount: data.discount,
        total: itemSubtotal,
        createdAt: createdAt.toISOString(),
      });
      if (saleError) throw saleError;

      const [{ error: itemError }, { error: payError }] = await Promise.all([
        supabase.from("SaleItem").insert({
          id: createId(),
          saleId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: product.price,
          discount: data.discount,
          subtotal: itemSubtotal,
        }),
        supabase.from("SalePayment").insert({
          id: createId(),
          saleId,
          method: data.paymentMethod,
          amount: itemSubtotal,
        }),
      ]);
      if (itemError) throw itemError;
      if (payError) throw payError;
    }
    console.log("✓ Ventas creadas");
  }

  await seedFinance(userIdByEmail);

  console.log("\n✅ Seed completado");
  console.log("\nCredenciales de acceso:");
  console.log("  Admin   → admin@fotostudio.mx   / admin123");
  console.log("  Cajero  → cajero@fotostudio.mx  / cajero123");
  console.log("  Editor  → editor@fotostudio.mx  / editor123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
