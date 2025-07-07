// src/services/userService.ts
import prisma from "../db";
import bcrypt from "bcrypt";

export async function createUser(
  name: string,
  email: string,
  password: string
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { name, email, passwordHash },
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  // Return only the fields you want exposed
  return { id: user.id, name: user.name, email: user.email };
}

export async function joinQueue(barberId: number, userId: number) {
  // drop any existing
  await prisma.queue.deleteMany({ where: { userId } });
  // create new
  return prisma.queue.create({
    data: { barberId, userId },
    include: { user: { select: { id: true, name: true } } },
  });
}
