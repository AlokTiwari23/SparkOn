import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();


// 1. Create the client
const redis = new Redis(process.env.REDIS_URL)

export default redis;