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
  const [, , entry] = await prisma.$transaction([
    // 1) Remove any existing queue rows for this user
    prisma.queue.deleteMany({ where: { userId } }),

    // 2) Reset the user’s queue flags
    prisma.user.update({
      where: { id: userId },
      data: { inQueue: false, queuedBarberId: null },
    }),

    // 3) Create the new queue entry
    prisma.queue.create({
      data: { barberId, userId },
      include: { user: { select: { id: true, name: true } } },
    }),

    // 4) Mark the user as in‐queue at this barber
    prisma.user.update({
      where: { id: userId },
      data: { inQueue: true, queuedBarberId: barberId },
    }),
  ]);

  return entry;
}

// at top of file…
const EARTH_RADIUS_KM = 6371;

// compute distance between two points (in km)
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Find barbers within a given radius (km) of a point.
 */
export async function getBarbersNearby(
  lat: number,
  long: number,
  radiusKm = 5
) {
  // 1) rough bounding box (lat ±, lon ±)
  const latDelta = radiusKm / 111; // ~1° lat ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLon = long - lonDelta;
  const maxLon = long + lonDelta;

  // 2) fetch candidates in box
  const candidates = await prisma.barber.findMany({
    where: {
      lat: { gte: minLat, lte: maxLat },
      long: { gte: minLon, lte: maxLon },
    },
    select: {
      id: true,
      name: true,
      username: true,
      lat: true,
      long: true,
    },
  });

  // 3) filter by actual circle distance
  return candidates
    .map((barber) => ({
      ...barber,
      distanceKm: haversine(lat, long, barber.lat, barber.long),
    }))
    .filter((b) => b.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
