import prisma from "../db/db.prisam.js";

import { format } from 'fast-csv';


export const getDashboardOverview = async (req, res, next) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const DAILY_ORDER_TARGET = 100; 
    const DAILY_BILLING_TARGET = 500000; 

    const [
      activeContractors, totalBulkOrders, pendingDispatch, revenueAggregation,
      unitsAggregation, todaysBillingAgg, liveDistributionCount, recentOrdersVolume,
      statusGroup, recentOrders
    ] = await Promise.all([
      prisma.electricianCustomer.count({ where: { is_active: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { order_status: 'PROCESSING' } }), 
      prisma.order.aggregate({ _sum: { total_amount: true } }),
      prisma.orderItem.aggregate({ _sum: { quantity: true } }),
      
      // Calculate Today's Billing
      prisma.order.aggregate({ _sum: { total_amount: true }, where: { created_at: { gte: startOfToday, lte: endOfToday }, order_status: { not: 'CANCELLED' } } }),
      
      // Calculate Live Distribution (Orders Today)
      prisma.order.count({ where: { created_at: { gte: startOfToday, lte: endOfToday }, order_status: { not: 'CANCELLED' } } }),
      
      prisma.order.findMany({ where: { created_at: { gte: sevenDaysAgo } }, select: { created_at: true, total_amount: true } }),
      prisma.order.groupBy({ by: ['order_status'], _count: { id: true } }),
      prisma.order.findMany({ take: 5, orderBy: { created_at: 'desc' }, include: { electrician: true, customer: true, shipping_address: true, orderItems: { include: { product: true } } } })
    ]);

    const totalRevenue = Number(revenueAggregation._sum.total_amount) || 0;
    const totalUnitsSold = unitsAggregation._sum.quantity || 0;
    
    // Process Today's Numbers
    const todaysBilling = Number(todaysBillingAgg._sum.total_amount) || 0;
    const liveDistribution = liveDistributionCount || 0;
    const distributionTargetPercent = Math.min((liveDistribution / DAILY_ORDER_TARGET) * 100, 100).toFixed(1);
    const billingTargetPercent = Math.min((todaysBilling / DAILY_BILLING_TARGET) * 100, 100).toFixed(1);

    // Calculate 7-Day Chart
    const dailyVolumeMap = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dailyVolumeMap[d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = 0;
    }
    recentOrdersVolume.forEach(order => {
        const dayString = order.created_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (dailyVolumeMap[dayString] !== undefined) dailyVolumeMap[dayString] += Number(order.total_amount);
    });
    const volumeTradeData = Object.keys(dailyVolumeMap).map(date => ({ date: date, volume: dailyVolumeMap[date] }));

    const colorMap = { 'PROCESSING': '#f97316', 'SHIPPED': '#3b82f6', 'DELIVERED': '#22c55e', 'CANCELLED': '#ef4444', 'RETURNED': '#8b5cf6' };
    const orderStatusData = statusGroup.map((group) => ({ name: group.order_status, value: group._count.id, color: colorMap[group.order_status] || '#cbd5e1' }));

    const dealsData = recentOrders.map((order) => {
      const firstItem = order.orderItems[0];
      const productData = firstItem?.product; 
      const totalQuantity = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
      return {
        id: order.id,
        product: productData ? productData.name : "Multiple Items",
        image: productData?.images?.[0] || "https://res.cloudinary.com/dg6vd2shw/image/upload/v1769106101/svgviewer-png-output_ghusut.png",
        contractor: order.electrician?.name || order.customer?.name || "Unknown Buyer",
        location: order.shipping_address?.city || "Unknown Location",
        dateTime: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(order.created_at).replace(',', ' -'),
        quantity: `${totalQuantity} Units`,
        amount: `₹${new Intl.NumberFormat('en-IN').format(Number(order.total_amount || 0))}`,
        status: order.order_status,
        statusColor: order.order_status === 'DELIVERED' || order.order_status === 'SHIPPED' ? "bg-green-100 text-green-600" : order.order_status === 'CANCELLED' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        stats: { activeContractors, totalBulkOrders, pendingDispatch, totalRevenue, totalUnitsSold },
        
        // 👇 THIS IS WHAT YOUR FRONTEND WAS MISSING!
        liveToday: { 
            todaysBilling, 
            billingTarget: DAILY_BILLING_TARGET, 
            billingProgress: Number(billingTargetPercent), 
            liveDistribution, 
            distributionTarget: DAILY_ORDER_TARGET, 
            distributionProgress: Number(distributionTargetPercent) 
        },
        
        volumeTradeData,
        orderStatusData,
        recentDeals: dealsData
      }
    });

  } catch (error) {
    console.error("Dashboard Aggregation Error:", error);
    next(error); 
  }
};



export const exportBulkOrders = async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sparkon_bulk_orders.csv"');

  const csvStream = format({ headers: true });
  csvStream.pipe(res);

  try {
    let skip = 0;
    const take = 1000; 
    let hasMoreData = true;

    while (hasMoreData) {
      const orders = await prisma.order.findMany({
        skip: skip,
        take: take,
        // ✅ FIX 1: Changed 'createdAt' to 'created_at' based on your schema
        orderBy: { created_at: 'desc' }, 
        
        // ✅ FIX 2: Changed 'user' to 'customer' and 'electrician' based on your schema
        include: { 
          customer: true,
          electrician: true 
        } 
      });

      if (orders.length === 0) {
        hasMoreData = false;
        break;
      }

      orders.forEach((order) => {
        // Safely grab the name whether they are registered as a customer or electrician
        const buyerName = order.customer?.name || order.electrician?.name || "Unknown Buyer";

        csvStream.write({
          "PO Number": `PO-${order.id}`,
          "Buyer Name": buyerName,
          // ✅ FIX 3: Mapped to your actual schema fields
          "Status": order.order_status || "N/A",
          "Payment Status": order.payment_status || "N/A",
          "Total Amount (INR)": order.total_amount || 0,
          "Total Paid (INR)": order.total_paid || 0,
          "Date Ordered": order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : "N/A"
        });
      });

      skip += take; 
    }

    csvStream.end();

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).end();
  }
};