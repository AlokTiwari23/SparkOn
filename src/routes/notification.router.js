import express from "express";
import { isAdmin } from "../middlewares/authentication/isAuthorizedRoles.js"
import { upload } from "../utils/multer.js"
import {
    createBanner, getBanners, toggleBannerStatus, deleteBanner,
    broadcastNotification, getBroadcastHistory, updateScheduledNotification, deleteNotification
} from '../controllers/notification.controllers.js';
import {  verfiyToken } from "../middlewares/authentication/isAuthenticated.js"

const promotionRouter = express.Router();

// Matches: api.post('/admin/banner')
promotionRouter.post('/banner', verfiyToken, isAdmin, upload.single('image'), createBanner);

// Matches: api.get('/admin/banner')
promotionRouter.get('/banner', verfiyToken, isAdmin, getBanners);

// Matches: api.patch(`/admin/banner/${id}/toggle`)
promotionRouter.patch('/banner/:id/toggle', verfiyToken, isAdmin, toggleBannerStatus);

// Matches: api.delete(`/admin/banner/${id}`)
promotionRouter.delete('/banner/:id', verfiyToken, isAdmin, deleteBanner);


// ==========================
// NOTIFICATION ROUTES
// ==========================

// Matches: api.post('/admin/notification/broadcast')
promotionRouter.post('/notification/broadcast', verfiyToken, isAdmin, upload.single('image'), broadcastNotification);

// Matches: api.get('/admin/notification/broadcasts')
promotionRouter.get('/notification/broadcasts', verfiyToken, isAdmin, getBroadcastHistory);

// Matches: api.put(`/admin/notification/:id`)
promotionRouter.put('/notification/:id', verfiyToken, isAdmin, upload.single('image'), updateScheduledNotification);

// Matches: api.delete(`/admin/notification/:id`)
promotionRouter.delete('/notification/:id', verfiyToken, isAdmin, deleteNotification);

export default promotionRouter;
