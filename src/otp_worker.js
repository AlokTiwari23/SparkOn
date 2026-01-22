import { Worker } from "bullmq";
import sendotp from "../src/utils/send-phone-otp.js";
import dotenv from "dotenv"
import { connection } from "./queue.js";
dotenv.config()

console.log('Worker started waiting for jobs...')
const worker = new Worker("sms-queue", async job => {
    const { phone_number, otp } = job.data
    const formattedNumber = `+91${phone_number}`

    await sendotp(formattedNumber, otp)

    console.log(`OTP sent to ${phone_number}`)


}, {
    connection,
    concurrency: 5
}

)

// listeners for debugging
worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with ${err.message}`);
});