import client from "../send-otp-config.js"
import dotenv from "dotenv"
dotenv.config()


export const sendotp = async(phone) =>{
    return client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
        to:phone,
        channel:"sms"
    })
}