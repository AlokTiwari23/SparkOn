import crypto from "crypto";
import { z } from "zod";
import { ValidationError } from "../middlewares/errorHandler/index.js";
import redis from "../db/redis.js";
import { sendemail } from "./sendMail/index.js";


// 1. Define the Schema once
const registerSchema = z.object({

    name: z.string().min(2, { message: "Name must be at least 2 characters" }),

    email: z.string().email({ message: "Invalid email address" }),

    password: z.string().min(6, { message: "Password must be at least 6 characters" }),

    phone_number: z.string().min(10, { message: "Phone number is too short" }),

    country: z.string().min(1, { message: "Country is required" })
});

export const validateRegistrationData = (data) => {
    // Note: user_type argument hata diya kyunki use nahi ho raha tha
    const result = registerSchema.safeParse(data);

    if (!result.success) {
        // Sirf pehla error message nikal kar throw karein
        const errorMessage = result.error.errors[0].message;
        throw new ValidationError(errorMessage);
    }
};

export const checkOtpRestrication = async (email) => {
    // wrong otp lock
    const [otpLock,spamlock,cooldown] = await Promise.all([
        redis.get(`otp_lock:${email}`),
        redis.get(`otp_spam_lock:${email}`),
        redis.get(`otp_cooldown:${email}`)
    ])

    if (otpLock) {
        throw new ValidationError("Account locked. Try again after 30 minutes.");
    }

    if (spamlock) {
        throw new ValidationError("Too many OTP requests. Try again after 1 hour.");
    }

    if (cooldown) {
        throw new ValidationError("Please wait 1 minute before requesting another OTP.");
    }

}


export const trackOtpRequests = async (email) => {

    // These time I make every redis work one by one Since they are not 
    // realted to each make them in Parllel
    const otpRequestKey = `otp_request_count:${email}`;
    const count = await redis.incr(otpRequestKey)


    // these we don't wait we can do at same time
    const promise = []

    if (count === 1) promise.push(redis.expire(otpRequestKey, 3600))
    // it will going to delete the key pair after the first otp 
    // send is 1 Hour..
    if (count > 5) {
        promise.push(redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600))

    }

    // why 2 Beacuse 1st time its 0 and second time its 1
    // third times it is 2

    await Promise.all(promise)

    if (count > 5) {
        throw new ValidationError(`Too many OTP requests! Please wait 1 hour before tryagain.`)

    }



}

export const sendOtp = async (email, name, template) => {
    // 4 digit otp
    try {
        const otp = crypto.randomInt(1000, 9999).toString();

        await redis.set(`otp:${email}`, otp, "EX", 300); // expirty of the otp 300
        await redis.set(`otp_cooldown:${email}`, "true", "EX", 60); // you can sent the otp in the timestamp of the 1 min

        setImmediate(() => {
            try{
                sendemail(email, "Verify your Email and Make Your Home Brighter -- Spark On", template, { // 1. Name of your App
                companyName: "Spark On",
                userName: name,
                otp: otp,
                companyUrl: "http://localhost:3000"
            })
            }catch(error){
                throw new ValidationError(`Error sending email ${error.message}`)
            }

        })



    } catch (error) {
        throw new ValidationError(`Error sending OTP ${error.message}`)
    }

}


export const verfiyotp = async (req, res, next) => {
    try {
         const sotredOtp = await redis.get(`otp:${email}`)

         if(!sotredOtp){
            return next(new ValidationError("Invalid or Expired OTP"))
         }

         

    } catch (error) {
        next(error)
    }
}





