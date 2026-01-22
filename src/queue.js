import { Queue } from "bullmq";
import dotenv from "dotenv"
import Redis from "ioredis";    
dotenv.config()


// Connnect the same Redis instance you use for caching 

const connection = new Redis(process.env.REDIS_URL , {
    maxRetriesPerRequest:null, // Required for BullMq
    tls:{
        rejectUnauthorized:false //Helps avoid SSL errors with some serverless providers
    }
})




export const smsQueue = new Queue("sms-queue",{
    connection
})   

export {connection};