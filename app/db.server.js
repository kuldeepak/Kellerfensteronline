import { PrismaClient } from "@prisma/client";

// Global variable for dev mode
const globalForPrisma = global;

// Create single instance
if (!globalForPrisma.prismaGlobal) {
  globalForPrisma.prismaGlobal = new PrismaClient({
    log: ['error', 'warn'],
  });
}

const prisma = globalForPrisma.prismaGlobal;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;