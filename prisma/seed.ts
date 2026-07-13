import "dotenv/config";
import { PrismaClient, Role, PaymentMethod } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const DEMO_USERS = [
  { name: "Ana García", email: "admin@fotostudio.mx", password: "admin123", role: Role.ADMIN, commissionPct: 0 },
  { name: "Luis Martínez", email: "cajero@fotostudio.mx", password: "cajero123", role: Role.CAJERO, commissionPct: 0 },
  { name: "Sofía Ruiz", email: "editor@fotostudio.mx", password: "editor123", role: Role.EDITOR, commissionPct: 0 },
  { name: "Dr. Ramón García", email: "dr.garcia@dental.mx", password: "doctor123", role: Role.AFILIADO, commissionPct: 10 },
];

// Las credenciales viven en Supabase Auth; la tabla User solo guarda perfil/rol
async function seedAuthUsers() {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

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
}

async function main() {
  await seedAuthUsers();

  const [admin, cajero, editor] = await Promise.all(
    DEMO_USERS.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { name: u.name, email: u.email, role: u.role, commissionPct: u.commissionPct },
      })
    )
  );

  console.log("✓ Usuarios creados (Supabase Auth + perfil)");

  // Categories
  const CATEGORIES = ["Retrato", "Corporativo", "Quinceañera", "Familia", "Bebé", "Otro"];
  await prisma.category.createMany({
    data: CATEGORIES.map((name) => ({ name })),
    skipDuplicates: true,
  });

  console.log("✓ Categorías creadas");

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: "prod_retrato_basico" },
      update: {},
      create: {
        id: "prod_retrato_basico",
        name: "Retrato Básico",
        description: "Sesión de 30 min, 1 fondo, 5 fotos editadas en digital",
        price: 800,
        category: "Retrato",
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod_retrato_premium" },
      update: {},
      create: {
        id: "prod_retrato_premium",
        name: "Retrato Premium",
        description: "Sesión de 1 hora, 3 fondos, 15 fotos editadas + álbum impreso",
        price: 2200,
        category: "Retrato",
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod_corporativo" },
      update: {},
      create: {
        id: "prod_corporativo",
        name: "Foto Corporativa",
        description: "Headshot profesional, fondo blanco/gris, 3 versiones editadas",
        price: 650,
        category: "Corporativo",
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod_quince" },
      update: {},
      create: {
        id: "prod_quince",
        name: "Paquete Quinceañera",
        description: "Sesión completa 3 horas, múltiples cambios de vestido, 40 fotos editadas + álbum",
        price: 5500,
        category: "Quinceañera",
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod_familia" },
      update: {},
      create: {
        id: "prod_familia",
        name: "Sesión Familiar",
        description: "Hasta 6 personas, 2 horas, 20 fotos editadas en digital",
        price: 1800,
        category: "Familia",
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod_bebe" },
      update: {},
      create: {
        id: "prod_bebe",
        name: "Sesión Bebé / Newborn",
        description: "Sesión especializada para bebés 0-3 meses, atrezzo incluido, 10 fotos",
        price: 1500,
        category: "Bebé",
        active: true,
      },
    }),
  ]);

  console.log("✓ Productos creados");

  // Clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: "cli_1" },
      update: {},
      create: {
        id: "cli_1",
        name: "María López",
        phone: "5551234567",
        email: "maria.lopez@gmail.com",
        notes: "Cliente frecuente, prefiere fondos claros",
      },
    }),
    prisma.client.upsert({
      where: { id: "cli_2" },
      update: {},
      create: {
        id: "cli_2",
        name: "Carlos Hernández",
        phone: "5559876543",
        email: "carlos.h@empresa.com",
      },
    }),
    prisma.client.upsert({
      where: { id: "cli_3" },
      update: {},
      create: {
        id: "cli_3",
        name: "Familia Rodríguez",
        phone: "5554567890",
        notes: "Sesión anual de familia, 4 integrantes",
      },
    }),
    prisma.client.upsert({
      where: { id: "cli_4" },
      update: {},
      create: {
        id: "cli_4",
        name: "Valentina Torres",
        phone: "5558765432",
        email: "valen.torres@hotmail.com",
        notes: "Quinceañera programada para diciembre",
      },
    }),
    prisma.client.upsert({
      where: { id: "cli_5" },
      update: {},
      create: {
        id: "cli_5",
        name: "Roberto Sánchez",
        phone: "5552345678",
        email: "r.sanchez@corporativo.mx",
      },
    }),
  ]);

  console.log("✓ Clientes creados");

  // Sales — 10 ventas de ejemplo
  const salesData = [
    {
      userId: admin.id,
      clientId: clients[0].id,
      productId: products[0].id,
      quantity: 1,
      discount: 0,
      paymentMethod: PaymentMethod.EFECTIVO,
      daysAgo: 1,
    },
    {
      userId: cajero.id,
      clientId: clients[1].id,
      productId: products[2].id,
      quantity: 2,
      discount: 100,
      paymentMethod: PaymentMethod.TARJETA,
      daysAgo: 1,
    },
    {
      userId: admin.id,
      clientId: clients[2].id,
      productId: products[4].id,
      quantity: 1,
      discount: 0,
      paymentMethod: PaymentMethod.TRANSFERENCIA,
      daysAgo: 2,
    },
    {
      userId: cajero.id,
      clientId: clients[3].id,
      productId: products[3].id,
      quantity: 1,
      discount: 500,
      paymentMethod: PaymentMethod.EFECTIVO,
      daysAgo: 3,
    },
    {
      userId: admin.id,
      clientId: clients[4].id,
      productId: products[1].id,
      quantity: 1,
      discount: 0,
      paymentMethod: PaymentMethod.TARJETA,
      daysAgo: 4,
    },
    {
      userId: cajero.id,
      clientId: clients[0].id,
      productId: products[5].id,
      quantity: 1,
      discount: 0,
      paymentMethod: PaymentMethod.EFECTIVO,
      daysAgo: 5,
    },
    {
      userId: admin.id,
      clientId: clients[1].id,
      productId: products[2].id,
      quantity: 3,
      discount: 0,
      paymentMethod: PaymentMethod.TRANSFERENCIA,
      daysAgo: 6,
    },
    {
      userId: cajero.id,
      clientId: clients[2].id,
      productId: products[0].id,
      quantity: 1,
      discount: 100,
      paymentMethod: PaymentMethod.EFECTIVO,
      daysAgo: 7,
    },
    {
      userId: admin.id,
      clientId: clients[3].id,
      productId: products[4].id,
      quantity: 1,
      discount: 0,
      paymentMethod: PaymentMethod.TARJETA,
      daysAgo: 8,
    },
    {
      userId: cajero.id,
      clientId: clients[4].id,
      productId: products[1].id,
      quantity: 1,
      discount: 200,
      paymentMethod: PaymentMethod.EFECTIVO,
      daysAgo: 10,
    },
  ];

  for (const data of salesData) {
    const product = products.find((p) => p.id === data.productId)!;
    const unitPrice = Number(product.price);
    const itemSubtotal = unitPrice * data.quantity - data.discount;
    const saleTotal = itemSubtotal;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - data.daysAgo);

    await prisma.sale.create({
      data: {
        userId: data.userId,
        clientId: data.clientId,
        subtotal: unitPrice * data.quantity,
        discount: data.discount,
        total: saleTotal,
        createdAt,
        items: {
          create: {
            productId: data.productId,
            quantity: data.quantity,
            unitPrice,
            discount: data.discount,
            subtotal: itemSubtotal,
          },
        },
        payments: {
          create: {
            method: data.paymentMethod,
            amount: saleTotal,
          },
        },
      },
    });
  }

  console.log("✓ Ventas creadas");
  console.log("\n✅ Seed completado");
  console.log("\nCredenciales de acceso:");
  console.log("  Admin   → admin@fotostudio.mx   / admin123");
  console.log("  Cajero  → cajero@fotostudio.mx  / cajero123");
  console.log("  Editor  → editor@fotostudio.mx  / editor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
