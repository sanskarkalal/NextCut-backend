"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBarber = createBarber;
exports.authenticateBarber = authenticateBarber;
exports.getQueue = getQueue;
exports.removeUserFromQueue = removeUserFromQueue;
const db_1 = __importDefault(require("../db"));
const bcrypt_1 = __importDefault(require("bcrypt"));
async function createBarber(name, username, password, lat, long) {
    try {
        console.log("Creating barber with data:", {
            name,
            username,
            lat,
            long,
        });
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const barber = await db_1.default.barber.create({
            data: { name, username, passwordHash, lat, long },
        });
        console.log("Barber created:", barber);
        return {
            id: barber.id,
            name: barber.name,
            username: barber.username,
            lat: barber.lat,
            long: barber.long,
        };
    }
    catch (error) {
        console.error("Error creating barber:", error);
        throw error;
    }
}
async function authenticateBarber(username, password) {
    try {
        const barber = await db_1.default.barber.findUnique({ where: { username } });
        if (!barber)
            return null;
        const valid = await bcrypt_1.default.compare(password, barber.passwordHash);
        if (!valid)
            return null;
        return {
            id: barber.id,
            name: barber.name,
            username: barber.username,
            lat: barber.lat,
            long: barber.long,
        };
    }
    catch (error) {
        console.error("Error authenticating barber:", error);
        throw new Error("Failed to authenticate barber");
    }
}
async function getQueue(barberId) {
    try {
        const barber = await db_1.default.barber.findUnique({
            where: { id: barberId },
        });
        if (!barber) {
            throw new Error("Barber not found");
        }
        return db_1.default.queue.findMany({
            where: { barberId },
            orderBy: { enteredAt: "asc" },
            include: { user: { select: { id: true, name: true } } },
        });
    }
    catch (error) {
        console.error("Error getting queue:", error);
        throw new Error("Failed to get queue");
    }
}
async function removeUserFromQueue(barberId, userId) {
    try {
        const queueEntry = await db_1.default.queue.findFirst({
            where: {
                barberId,
                userId,
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });
        if (!queueEntry) {
            return {
                success: false,
                message: "User is not in this barber's queue",
                data: null,
            };
        }
        const [deletedEntry] = await db_1.default.$transaction([
            db_1.default.queue.delete({
                where: { id: queueEntry.id },
                include: {
                    user: { select: { id: true, name: true } },
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
            message: `Successfully removed ${deletedEntry.user.name} from queue`,
            data: {
                removedUser: deletedEntry.user,
                removedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        console.error("Error removing user from queue:", error);
        throw new Error("Failed to remove user from queue");
    }
}
