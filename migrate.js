const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log("Creating database tables...");
    
    // Create User table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inQueue" BOOLEAN NOT NULL DEFAULT false,
        "queuedBarberId" INTEGER,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "User_queuedBarberId_idx" ON "User"("queuedBarberId");
    `;
    
    // Create Barber table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Barber" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "lat" DOUBLE PRECISION NOT NULL,
        "long" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Barber_username_key" ON "Barber"("username");
    `;
    
    // Create Queue table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Queue" (
        "id" SERIAL NOT NULL,
        "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "barberId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        CONSTRAINT "Queue_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Queue_userId_key" ON "Queue"("userId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Queue_barberId_enteredAt_idx" ON "Queue"("barberId", "enteredAt");
    `;
    
    // Add foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "Queue" 
      ADD CONSTRAINT IF NOT EXISTS "Queue_barberId_fkey" 
      FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Queue" 
      ADD CONSTRAINT IF NOT EXISTS "Queue_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    
    console.log("✅ Database tables created successfully");
    
    // Test the tables
    const userCount = await prisma.user.count();
    const barberCount = await prisma.barber.count();
    const queueCount = await prisma.queue.count();
    console.log(`✅ Tables created - Users: ${userCount}, Barbers: ${barberCount}, Queue: ${queueCount}`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
