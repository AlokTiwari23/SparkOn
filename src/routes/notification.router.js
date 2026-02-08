import express from "express";
import { getNotification, markRead } from "../controllers/notification.controllers.js";

const notificationrouter = express.Router();

notificationrouter.get('/' , getNotification)

notificationrouter.patch('/:id/read' , markRead)

export default notificationrouter;