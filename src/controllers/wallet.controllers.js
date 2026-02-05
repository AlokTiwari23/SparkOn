import { success } from "zod";
import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js"
import { Message } from "twilio/lib/twiml/MessagingResponse.js";

export const getwalletPassbook = async (req, res, next) => {
    try {
        const electricianId = req.user.id;  // Must be Electrician

        // 1. Fetch History
        const ledgers = await prisma.walletLedger.findMany({
            where: { electrician_id: electricianId },
            orderBy: { created_at: 'desc' }
        })

        // 2. Calculate Balance Dynamically
        // CREDIT = Money In (+) , DEBIT = oney Out (-)

        let balance = 0;
        ledgers.forEach(entry => {
            if (entry.type === "CREDIT") {
                balance += Number(entry.amount)
            } else {
                balance -= Number(entry.amount)
            }

        });

        res.status(200).json({
            success: true,
            balance: balance.toFixed(2),
            history: ledgers
        })

    } catch (error) {
        next(error)
    }
}



// ✅ FIXED: Pay With Wallet
export const payWithWallet = async (req, res, next) => {
    try {
        const electricianId = req.user.id; // 👈 FIX: No destructuring
        const { orderId, amount } = req.body;

        // 1. Check Balance First!
        const ledgers = await prisma.walletLedger.findMany({ where: { electrician_id: electricianId } });
        let balance = 0;
        ledgers.forEach(l => l.type === "CREDIT" ? balance += Number(l.amount) : balance -= Number(l.amount));

        if (balance < parseFloat(amount)) {
            return next(new ValidationError("Insufficient Wallet Balance"));
        }

        // 2. Transaction
        await prisma.$transaction(async (tx) => {
            await tx.walletLedger.create({
                data: {
                    electrician_id: electricianId,
                    amount: parseFloat(amount),
                    type: "DEBIT",
                    category: "POINT",
                    reference_id: `ORD-${orderId}`,
                    description: `Payment for Order #${orderId}`
                }
            });

            await tx.order.update({
                where: { id: parseInt(orderId) },
                data: { payment_status: "SUCCESS", total_paid: parseFloat(amount) }
            });
        });

        res.status(200).json({ success: true, message: "Paid using Wallet" });

    } catch (error) { next(error); }
};

// ✅ FIXED: Withdrawal Request (Links to PayoutRequest Table)
export const requestWithdrawal = async (req, res, next) => {
    try {
        const electricianId = req.user.id; 
        const { amount } = req.body;

        // 1. Check Balance
        const ledgers = await prisma.walletLedger.findMany({ where: { electrician_id: electricianId } });
        let balance = 0;
        ledgers.forEach(l => l.type === "CREDIT" ? balance += Number(l.amount) : balance -= Number(l.amount));

        if (balance < parseFloat(amount)) {
            return next(new ValidationError("Insufficient Balance"));
        }

        // 2. Transaction: Create Request AND Lock Money
        await prisma.$transaction(async (tx) => {
            // A. Create Payout Request (So Admin sees it)
            const payout = await tx.payoutRequest.create({
                data: {
                    electrician_id: electricianId,
                    amount: parseFloat(amount),
                    status: "REQUESTED"
                }
            });

            // B. Debit Wallet Immediately (Lock funds)
            await tx.walletLedger.create({
                data: {
                    electrician_id: electricianId,
                    amount: parseFloat(amount),
                    type: "DEBIT",
                    category: "WITHDRAWAL",
                    reference_id: `PAY-${payout.id}`, // Link to the Payout ID
                    description: "Withdrawal Request Initiated"
                }
            });
        });

        res.status(200).json({ success: true, message: "Withdrawal request submitted" });

    } catch (error) { next(error); }
};