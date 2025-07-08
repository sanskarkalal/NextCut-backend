"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.authenticateUser = authenticateUser;
exports.joinQueue = joinQueue;
exports.removeFromQueue = removeFromQueue;
exports.getUserQueueStatus = getUserQueueStatus;
exports.getBarbersNearby = getBarbersNearby;
const db_1 = __importDefault(require("../db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function createUser(name, email, password) {
    try {
        console.log(`Creating user with email: ${email}`);
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = await db_1.default.user.create({
            data: { name, email, passwordHash },
        });
        console.log(`User created successfully with ID: ${user.id}`);
        return user;
    }
    catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Failed to create user");
    }
}
async function authenticateUser(email, password) {
    try {
        console.log(`Attempting to authenticate user with email: ${email}`);
        const user = await db_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            console.log(`User not found with email: ${email}`);
            return null;
        }
        console.log(`User found, checking password for user ID: ${user.id}`);
        const valid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!valid) {
            console.log(`Invalid password for user: ${email}`);
            return null;
        }
        console.log(`Authentication successful for user: ${email}`);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
        };
    }
    catch (error) {
        console.error("Error authenticating user:", error);
        throw new Error("Failed to authenticate user");
    }
}
async function joinQueue(barberId, userId) {
    try {
        const barber = await db_1.default.barber.findUnique({
            where: { id: barberId },
        });
        if (!barber) {
            throw new Error("Barber not found");
        }
        const [, , entry] = await db_1.default.$transaction([
            db_1.default.queue.deleteMany({ where: { userId } }),
            db_1.default.user.update({
                where: { id: userId },
                data: { inQueue: false, queuedBarberId: null },
            }),
            db_1.default.queue.create({
                data: { barberId, userId },
                include: {
                    user: { select: { id: true, name: true } },
                    barber: { select: { id: true, name: true } },
                },
            }),
            db_1.default.user.update({
                where: { id: userId },
                data: { inQueue: true, queuedBarberId: barberId },
            }),
        ]);
        return entry;
    }
    catch (error) {
        console.error("Error joining queue:", error);
        throw new Error("Failed to join queue");
    }
}
async function removeFromQueue(userId) {
    try {
        const existingQueueEntry = await db_1.default.queue.findUnique({
            where: { userId },
            include: {
                barber: { select: { id: true, name: true } },
            },
        });
        if (!existingQueueEntry) {
            return {
                success: false,
                message: "You are not currently in any queue",
                data: null,
            };
        }
        const [deletedEntry] = await db_1.default.$transaction([
            db_1.default.queue.delete({
                where: { userId },
                include: {
                    barber: { select: { id: true, name: true } },
                },
            }),
            db_1.default.user.update({
                where: { id: userId },
                data: {
                    inQueue: false,
                    queuedBarberId: null,
                },
            }),
        ]);
        return {
            success: true,
            message: `Successfully removed from ${deletedEntry.barber.name}'s queue`,
            data: {
                removedFrom: deletedEntry.barber,
                removedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console.error("Error removing from queue:", error);
        throw new Error("Failed to remove from queue");
    }
}
async function getUserQueueStatus(userId) {
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                inQueue: true,
                queuedBarberId: true,
                Queue: {
                    include: {
                        barber: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        if (!user.inQueue || !user.Queue) {
            return {
                inQueue: false,
                queuePosition: null,
                barber: null,
                enteredAt: null,
            };
        }
        const position = await db_1.default.queue.count({
            where: {
                barberId: user.queuedBarberId,
                enteredAt: {
                    lt: user.Queue.enteredAt,
                },
            },
        });
        return {
            inQueue: true,
            queuePosition: position + 1,
            barber: user.Queue.barber,
            enteredAt: user.Queue.enteredAt,
        };
    }
    catch (error) {
        console.error("Error getting user queue status:", error);
        throw new Error("Failed to get queue status");
    }
}
const EARTH_RADIUS_KM = 6371;
function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}
async function getBarbersNearby(lat, long, radiusKm = 5) {
    try {
        if (lat < -90 || lat > 90 || long < -180 || long > 180) {
            throw new Error("Invalid latitude or longitude");
        }
        if (radiusKm <= 0) {
            throw new Error("Radius must be positive");
        }
        const latDelta = radiusKm / 111;
        const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLon = long - lonDelta;
        const maxLon = long + lonDelta;
        const candidates = await db_1.default.barber.findMany({
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
                createdAt: true,
                queueEntries: {
                    select: {
                        id: true,
                        enteredAt: true,
                        user: { select: { id: true, name: true } },
                    },
                    orderBy: { enteredAt: "asc" },
                },
            },
        });
        const nearbyBarbers = candidates
            .map((barber) => ({
            ...barber,
            distanceKm: haversine(lat, long, barber.lat, barber.long),
            queueLength: barber.queueEntries.length,
            queueEntries: undefined,
        }))
            .filter((barber) => barber.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
        console.log(`Found ${nearbyBarbers.length} barbers within ${radiusKm}km`);
        return nearbyBarbers;
    }
    catch (error) {
        console.error("Error getting nearby barbers:", error);
        throw new Error("Failed to get nearby barbers");
    }
}
