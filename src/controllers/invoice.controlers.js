import prisma from "../db/db.prisam.js";

export const downloadInvoice = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        // 1. Check if we already generated it
        const existing = await prisma.invoice.findFirst({ where: { order_id: parseInt(orderId) } });
        if (existing) {
             return res.status(200).json({ success: true, url: existing.pdf_url });
        }

        // 2. MOCK: Since we don't have a real PDF generator setup yet
        const fakeUrl = `https://sparkon-docs.com/invoices/INV-${orderId}.pdf`; 

        // 3. Save to DB
        const newInvoice = await prisma.invoice.create({
            data: {
                order_id: parseInt(orderId),
                pdf_url: fakeUrl
            }
        });

        res.status(201).json({ success: true, url: newInvoice.pdf_url });

    } catch (error) { next(error); }
};