import prisma from "../db/db.prisam.js";

import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js";

// ==========================================
// 🎯 BANNER & POPUP CONTROLLERS
// ==========================================

export const createBanner = async (req, res, next) => {
    try {
        const { title, targetScreen, targetId, displayType } = req.body;
        const file = req.file; // Caught by multer

        if (!file) return res.status(400).json({ success: false, message: "Banner image is required" });

        // 1. Upload to Cloudinary
        const uploadResult = await uploadOnCloudinary(file.path);
        if (!uploadResult) return res.status(500).json({ success: false, message: "Image upload failed" });

        // 2. Save to Database
        const banner = await prisma.banner.create({
            data: {
                imageUrl: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                title: title || null,
                targetScreen: targetScreen || "HOME",
                targetId: targetId || null,
                displayType: displayType || "SLIDER"
            }
        });

        res.status(201).json({ success: true, message: "Banner created successfully", banner });
    } catch (error) {
        next(error);
    }
};

export const getBanners = async (req, res, next) => {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, banners });
    } catch (error) {
        next(error);
    }
};

export const toggleBannerStatus = async (req, res, next) => {
    try {
        const { id } = req.params; // Banner ID is a String (UUID)
        const banner = await prisma.banner.findUnique({ where: { id } });
        
        if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

        const updatedBanner = await prisma.banner.update({
            where: { id },
            data: { isActive: !banner.isActive }
        });

        res.status(200).json({ success: true, message: "Banner status updated", banner: updatedBanner });
    } catch (error) {
        next(error);
    }
};

export const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const banner = await prisma.banner.findUnique({ where: { id } });
        if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

        // Optional: Delete from Cloudinary to save space
        // await deleteFromCloudinary(banner.publicId);

        await prisma.banner.delete({ where: { id } });
        res.status(200).json({ success: true, message: "Banner deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 🔔 NOTIFICATION & BROADCAST CONTROLLERS
// ==========================================

export const broadcastNotification = async (req, res, next) => {
    try {
        // 🚀 1. Cleaned up: Only extracting what the new frontend actually sends
        const { title, message, audience, scheduledFor } = req.body;
        const file = req.file;

        let image_url = null;
        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path);
            if (uploadResult) image_url = uploadResult.secure_url;
        }

        const broadcastType = `BROADCAST_${audience || 'ALL'}`; 
        const scheduleDate = scheduledFor ? new Date(scheduledFor) : null;

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                type: broadcastType,
                image_url,
                // 🚀 2. Syncing the dates based on the single scheduledFor input
                scheduled_for: scheduleDate, 
                valid_from: scheduleDate || new Date(), // Starts when it sends
                valid_until: null, // Never auto-expires from the DB
            }
        });

        // 🚀 3. Simplified Logic: Only handling Firebase Push
        if (!scheduleDate || scheduleDate <= new Date()) {
            console.log(`[Firebase] Sending lock-screen push to ${audience}...`);
            // Here is where you will eventually add Firebase logic:
            // firebase.messaging().sendMulticast(...)
        } else {
            console.log(`[Scheduler] Push notification queued for ${scheduleDate}`);
        }

        res.status(201).json({ success: true, message: "Push alert processed!", notification });
    } catch (error) {
        next(error);
    }
};

export const getBroadcastHistory = async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                customer_id: null,
                electrician_id: null,
                type: { startsWith: 'BROADCAST_' }
            },
            orderBy: { created_at: 'desc' },
            take: 50
        });

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        next(error);
    }
};

export const updateScheduledNotification = async (req, res, next) => {
    try {
        const { id } = req.params; 
        // 🚀 Cleaned up extraction here as well
        const { title, message, audience, scheduledFor } = req.body;
        const file = req.file;

        const scheduleDate = scheduledFor ? new Date(scheduledFor) : null;

        let updateData = {
            title,
            message,
            type: `BROADCAST_${audience || 'ALL'}`,
            scheduled_for: scheduleDate,
            valid_from: scheduleDate || new Date(),
            valid_until: null
        };

        if (file) {
            const uploadResult = await uploadOnCloudinary(file.path);
            if (uploadResult) updateData.image_url = uploadResult.secure_url;
        }

        const updatedNoti = await prisma.notification.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.status(200).json({ success: true, message: "Push schedule updated", notification: updatedNoti });
    } catch (error) {
        next(error);
    }
};

export const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ success: true, message: "Notification deleted" });
    } catch (error) {
        next(error);
    }
};