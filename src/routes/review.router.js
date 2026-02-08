import express from "express";
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js";
import { addReview, getProductReviews } from "../controllers/review.controllers.js";

const reviewrouter = express.Router()

reviewrouter.post("/add/reviews" , verfiyToken , addReview)
reviewrouter.get("/:id/reviews" , getProductReviews)

export default reviewrouter;
