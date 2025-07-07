// src/services/barberService.ts
import { Prisma } from "@prisma/client";
import prisma from "../db";
import bcrypt from "bcrypt";

export interface BarberDTO {
  id: number;
  name: string;
  username: string;
  lat: number;
  long: number;
}

export async function createBarber(
  name: string,
  username: string,
  password: string,
  lat: number,
  long: number
): Promise<BarberDTO> {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const barber = await prisma.barber.create({
      data: { name, username, passwordHash, lat, long },
    });
    return {
      id: barber.id,
      name: barber.name,
      username: barber.username,
      lat: barber.lat,
      long: barber.long,
    };
  } catch (err: any) {
    return err;
  }
}

export async function authenticateBarber(
  username: string,
  password: string
): Promise<BarberDTO | null> {
  const barber = await prisma.barber.findUnique({ where: { username } });

  if (!barber) return null;

  const valid = await bcrypt.compare(password, barber.passwordHash);

  if (!valid) return null;

  return {
    id: barber.id,
    name: barber.name,
    username: barber.username,
    lat: barber.lat,
    long: barber.long,
  };
}

export async function getQueue(
  barberId: number
): Promise<Prisma.QueueGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>[]> {
  return prisma.queue.findMany({
    where: { barberId },
    orderBy: { enteredAt: 'asc' },
    include: { user: { select: { id: true, name: true } } }
  });
}
