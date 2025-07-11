// src/services/userServices.ts
import { Prisma } from "@prisma/client";
import prisma from "../db";

export interface UserDTO {
  id: number;
  name: string;
  phoneNumber: string;
}

// Phone number validation for India
function validateIndianPhoneNumber(phoneNumber: string): string {
  // Remove all non-digits
  let cleanPhone = phoneNumber.replace(/\D/g, "");

  // If starts with +91, remove it
  if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.substring(2);
  }

  // Should be exactly 10 digits
  if (cleanPhone.length !== 10) {
    throw new Error("Phone number must be 10 digits");
  }

  // Should start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleanPhone)) {
    throw new Error("Invalid Indian phone number format");
  }

  return cleanPhone;
}

export async function createUser(
  name: string,
  phoneNumber: string
): Promise<UserDTO> {
  try {
    console.log("Creating user with data:", { name, phoneNumber });

    // Validate and clean phone number
    const cleanPhoneNumber = validateIndianPhoneNumber(phoneNumber);

    const user = await prisma.user.create({
      data: {
        name,
        phoneNumber: cleanPhoneNumber,
      },
    });

    console.log("User created:", user);
    return {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new Error("Phone number already registered");
      }
    }
    throw error;
  }
}

export async function authenticateUser(
  phoneNumber: string
): Promise<UserDTO | null> {
  try {
    // Validate and clean phone number
    const cleanPhoneNumber = validateIndianPhoneNumber(phoneNumber);

    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhoneNumber },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      phoneNumber: user.phoneNumber,
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    throw new Error("Failed to authenticate user");
  }
}

export async function joinQueue(
  userId: number,
  barberId: number,
  service: string
): Promise<
  Prisma.QueueGetPayload<{
    include: {
      user: { select: { id: true; name: true; phoneNumber: true } };
      barber: { select: { id: true; name: true; lat: true; long: true } };
    };
  }>
> {
  try {
    // Validate service type
    const validServices = ["haircut", "beard", "haircut+beard"];
    if (!validServices.includes(service)) {
      throw new Error(
        "Invalid service type. Must be haircut, beard, or haircut+beard"
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is already in a queue
    if (user.inQueue) {
      throw new Error("You are already in a queue");
    }

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    if (!barber) {
      throw new Error("Barber not found");
    }

    // Add to queue and update user status
    const [queueEntry] = await prisma.$transaction([
      prisma.queue.create({
        data: {
          userId,
          barberId,
          service,
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
          barber: { select: { id: true, name: true, lat: true, long: true } },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { inQueue: true, queuedBarberId: barberId },
      }),
    ]);

    return queueEntry;
  } catch (error) {
    console.error("Error joining queue:", error);
    throw error;
  }
}

export async function getBarbersNearby(
  userLat: number,
  userLong: number,
  radius: number = 10
): Promise<
  Array<
    Prisma.BarberGetPayload<{
      select: {
        id: true;
        name: true;
        username: true;
        lat: true;
        long: true;
        queueEntries: {
          include: { user: { select: { id: true; name: true } } };
          orderBy: { enteredAt: "asc" };
        };
      };
    }>
  >
> {
  try {
    const barbers = await prisma.barber.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        lat: true,
        long: true,
        queueEntries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { enteredAt: "asc" },
        },
      },
    });

    // Calculate distance and filter by radius
    const barbersWithDistance = barbers
      .map((barber) => {
        const distance = calculateDistance(
          userLat,
          userLong,
          barber.lat,
          barber.long
        );
        return { ...barber, distance };
      })
      .filter((barber) => barber.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return barbersWithDistance;
  } catch (error) {
    console.error("Error getting nearby barbers:", error);
    throw new Error("Failed to get nearby barbers");
  }
}

export async function removeFromQueue(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Queue: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.inQueue || !user.Queue) {
      throw new Error("User is not in any queue");
    }

    // Remove from queue and update user status
    await prisma.$transaction([
      prisma.queue.delete({
        where: { userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { inQueue: false, queuedBarberId: null },
      }),
    ]);

    return { success: true, message: "Successfully removed from queue" };
  } catch (error) {
    console.error("Error removing from queue:", error);
    throw error;
  }
}

export async function getUserQueueStatus(userId: number): Promise<{
  inQueue: boolean;
  queuePosition: number | null;
  barber: { id: number; name: string; lat: number; long: number } | null;
  enteredAt: string | null;
  service: string | null;
  estimatedWaitTime: number | null; // in minutes
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Queue: {
          include: {
            barber: { select: { id: true, name: true, lat: true, long: true } },
          },
        },
      },
    });

    if (!user || !user.inQueue || !user.Queue) {
      return {
        inQueue: false,
        queuePosition: null,
        barber: null,
        enteredAt: null,
        service: null,
        estimatedWaitTime: null,
      };
    }

    // Get position in queue
    const position = await prisma.queue.count({
      where: {
        barberId: user.Queue.barberId,
        enteredAt: { lte: user.Queue.enteredAt },
      },
    });

    // Calculate estimated wait time based on service types
    const queueAhead = await prisma.queue.findMany({
      where: {
        barberId: user.Queue.barberId,
        enteredAt: { lt: user.Queue.enteredAt },
      },
      select: { service: true },
    });

    const estimatedWaitTime = calculateEstimatedWaitTime(
      queueAhead,
      user.Queue.service
    );

    return {
      inQueue: true,
      queuePosition: position,
      barber: user.Queue.barber,
      enteredAt: user.Queue.enteredAt.toISOString(),
      service: user.Queue.service,
      estimatedWaitTime,
    };
  } catch (error) {
    console.error("Error getting user queue status:", error);
    throw new Error("Failed to get queue status");
  }
}

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Helper function to calculate estimated wait time
function calculateEstimatedWaitTime(
  queueAhead: Array<{ service: string }>,
  currentService: string
): number {
  const serviceTimes = {
    haircut: 20,
    beard: 5,
    "haircut+beard": 25,
  };

  // Calculate time for all people ahead in queue
  let totalWaitTime = 0;
  for (const entry of queueAhead) {
    totalWaitTime +=
      serviceTimes[entry.service as keyof typeof serviceTimes] || 20;
  }

  return totalWaitTime;
}
