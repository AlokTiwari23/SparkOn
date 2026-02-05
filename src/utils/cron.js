import prisma from "../db/db.prisam.js";

// Call this function once a week (using node-cron or manually)
export const cleanupDatabase = async () => {
    console.log("🧹 Starting Database Cleanup...");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 1. Delete Old Notifications (They are useless after 6 months)
    const deletedNotifs = await prisma.notification.deleteMany({
        where: {
            created_at: { lt: sixMonthsAgo }
        }
    });
    console.log(`🗑️ Deleted ${deletedNotifs.count} old notifications.`);

    // 2. Delete Old Login OTPs (From Redis or DB if you stored them)
    // (Redis usually handles this automatically with TTL)

    // 3. (Optional) Archive Old Cart Sessions that were never ordered
    const deletedCarts = await prisma.cartSession.deleteMany({
        where: {
            updated_at: { lt: sixMonthsAgo },
            cartItems: { none: {} } // Delete empty old carts
        }
    });
    console.log(`🗑️ Deleted ${deletedCarts.count} ghost carts.`);
    
    console.log("✨ Cleanup Complete. Space Saved.");
};