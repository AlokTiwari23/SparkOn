import crypto from "crypto";
import { ValidationError } from "../middlewares/errorHandler/index.js";
import redis from "../db/redis.js";

import prisma from "../db/db.prisam.js"
import { smsQueue } from "../queue.js";





export const validateRegistrationData = (phone_number) => {

    if (!/^[6-9]\d{9}$/.test(phone_number)) {
        throw new ValidationError("Invalid Indian phone number");
    }
};

const checkOtpRestrication = async (phone_number) => {
    // wrong otp lock
    const [otpLock, spamlock, cooldown] = await Promise.all([
        redis.get(`otp_lock:${phone_number}`),
        redis.get(`otp_spam_lock:${phone_number}`),
        redis.get(`otp_cooldown:${phone_number}`)
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

// there is some error in the trackOtpRequest check and solve

const trackOtpRequests = async (phone_number) => {

    // These time I make every redis work one by one Since they are not 
    // realted to each make them in Parllel
    const otpRequestKey = `otp_request_count:${phone_number}`;
    const count = await redis.incr(otpRequestKey)


    // these we don't wait we can do at same time
    const promise = []

    if (count === 1) promise.push(redis.expire(otpRequestKey, 3600))
    // it will going to delete the key pair after the first otp 
    // send is 1 Hour..
    if (count > 5) {
        promise.push(redis.set(`otp_spam_lock:${phone_number}`, "locked", "EX", 3600))

    }

    // why 2 Beacuse 1st time its 0 and second time its 1
    // third times it is 2

    await Promise.all(promise)

    if (count > 5) {
        throw new ValidationError(`Too many OTP requests! Please wait 1 hour before tryagain.`)

    }



}


export const verifyotp = async (phone_number, otp) => {
    try {


        const saved_otp = await redis.get(`otp:${phone_number}`);

        if (!saved_otp) {
            throw new ValidationError(`Please Try Again`)

        }

        if (otp !== saved_otp) {
            throw new ValidationError(`Wrong OTP`)
        }
        await redis.del(`otp:${phone_number}`)

    } catch (error) {
        throw new ValidationError(`Wrong OTP ${error.message}`)
    }

}



function generateReferralCode(name, phone) {
    // Remove spaces and take first 2 letters of name (uppercase)
    const namePart = name.replace(/\s+/g, "").substring(0, 2).toUpperCase();

    // Take last 3 digits of phone number
    const phonePart = phone.slice(-3);

    // Combine
    return `${namePart}${phonePart}`;
}



export const savedata = async (name, phone_number, role) => {
    try {

        if (role === "CUSTOMER") {
            await prisma.user_customer.create({
                data: {
                    name,
                    phone_number
                }
            })
        }
        if (role === "ELECTRICAN") {
            await prisma.electrician_customer.create({
                data: {
                    name,
                    phone_number,
                    reffreal_code: generateReferralCode(name, phone_number)
                }
            })
        }

        await redis.del(`info:${phone_number}`)

    }
    catch (error) {
        throw new ValidationError(`Error saving data ${error.message}`)

    }
}

export const otprequest = async (phone_number) => {

    try {
        // Check otp restircation
        await checkOtpRestrication(phone_number);
        await trackOtpRequests(phone_number);


        const otp = crypto.randomInt(100000, 999999).toString();

        const promise = []


        promise.push(redis.set(`otp:${phone_number}`, otp, "EX", 300))
        promise.push(redis.set(`otp_cooldown:${phone_number}`, "true", "EX", 60))

        await Promise.all(promise)



        // Add to BullMQ ( The heavy lifting happens later)
        await smsQueue.add('send-otp', {
            phone_number,
            otp

        }, {
            attempts: 3, //Retry3 times if twilio fails
            backoff: 5000, // Wait 5 second  between  retries
            removeOnComplete: true // Delete the job when the job succesfully done
        }

        )




    } catch (error) {
        throw new ValidationError(`Error sending OTP ${error.message}`)


    }





}