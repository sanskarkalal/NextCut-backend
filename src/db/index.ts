// src/db/index.ts

import { PrismaClient } from "@prisma/client"; // ← named import, not default

// Now this is constructable:
const prisma = new PrismaClient();

export default prisma;
