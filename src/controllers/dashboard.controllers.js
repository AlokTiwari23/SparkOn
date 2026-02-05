import prisma from "../db/db.prisam.js";

export const getAdminDashboard = async (req, res, next) => {
    try {
        const [
            totalConsumers,
            totalElectricians,
            totalOrders,
            lowStockItems
        ] = await Promise.all([
            prisma.UserCustomer.count(),
            prisma.ElectricianCustomer.count(),
            prisma.order.count(),
            prisma.product.count({ where: { stock: { lt: 10 }, isActive: true } }) // Alert if stock < 10
        ]);

        res.status(200).json({
            success: true,
            stats: {
                users: totalConsumers,
                electricians: totalElectricians,
                orders: totalOrders,
                alerts: {
                    lowStock: lowStockItems
                }
            }
        });
    } catch (error) { next(error); }
};