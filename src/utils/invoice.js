import PDFDocument from 'pdfkit';
import { prisma } from '../config/db.js';
import { ValidationError } from '../utils/errorHandler.js';

export const downloadInvoice = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        // 1. Fetch Order Data (Need rich details for the bill)
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: {
                customer: { select: { name: true, email: true } },
                electrician: { select: { name: true, email: true } },
                address: true,
                orderItems: true
            }
        });

        if (!order) return next(new ValidationError("Order not found"));

        // 2. Permission Check (Only Owner or Admin can download)
        // ... (Insert your standard permission logic here) ...

        // 3. SET HEADERS (Tells the browser "This is a PDF file")
        const filename = `invoice-${order.id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // 4. GENERATE PDF (Using PDFKit)
        const doc = new PDFDocument({ margin: 50 });

        // Pipe the PDF directly to the Response (Stream)
        doc.pipe(res);

        // --- DRAWING THE INVOICE ---
        
        // A. Header
        doc.fontSize(20).text('SparkOn Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice ID: #INV-${order.id}`);
        doc.text(`Date: ${order.created_at.toDateString()}`);
        doc.moveDown();

        // B. Addresses
        const userName = order.customer ? order.customer.name : order.electrician.name;
        doc.text(`Bill To: ${userName}`);
        doc.text(`${order.address.street_address}, ${order.address.city}`);
        doc.text(`${order.address.state} - ${order.address.pincode}`);
        doc.moveDown();
        doc.text('-------------------------------------------------------');

        // C. Table Header
        let y = doc.y + 10;
        doc.text('Item', 50, y);
        doc.text('Qty', 300, y);
        doc.text('Price', 370, y);
        doc.text('Total', 450, y);
        doc.moveDown();

        // D. Table Rows (The Items)
        order.orderItems.forEach(item => {
            y = doc.y + 10;
            doc.text(item.name.substring(0, 30), 50, y); // Limit name length
            doc.text(item.quantity.toString(), 300, y);
            doc.text(item.frozen_price.toString(), 370, y);
            doc.text(item.subtotal.toString(), 450, y);
        });

        doc.moveDown(2);
        doc.text('-------------------------------------------------------');

        // E. Total
        doc.fontSize(14).text(`Total Amount: Rs. ${order.total_amount}`, { align: 'right' });

        // F. Footer
        doc.fontSize(10).text('Thank you for shopping with SparkOn!', 50, 700, { align: 'center', width: 500 });

        // 5. FINISH
        doc.end();

    } catch (error) {
        next(error);
    }
};