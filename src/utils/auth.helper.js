import crypto from "crypto";
import { ValidationError } from "../middlewares/errorHandler/index.js";
import redis from "../db/redis.js";
import prisma from "../db/db.prisam.js"
import sendotp from "./send-phone-otp.js";





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
        throw new ValidationError("Account locked.Try again after 30 minutes.");
    }

    if (spamlock) {
        throw new ValidationError("Too many OTP requests.Try again after 1 hour.");
    }

    if (cooldown) {
        throw new ValidationError("Please wait 1 minute before requesting another OTP.");
    }

}

// there is some error in the trackOtpRequest check and solve

const trackOtpRequests = async (phone_number) => {

    // These time I make every redis work one by one Since they are not 
    // realted to each make them in Parllel
    const otpRequestKey = `otp_request_count:${phone_number}`
    const spamlockKey = `otp_spam_lock:${phone_number}`;
    const count = await redis.incr(otpRequestKey)


    // these we don't wait we can do at same time
    const promises = []

    if (count === 1) promises.push(redis.expire(otpRequestKey, 3600))
    // it will going to delete the key pair after the first otp 
    // send is 1 Hour..
    if (count>3) {
        promises.push(redis.set(spamlockKey, "locked", "EX", 3600))

    }

    // why 2 Beacuse 1st time its 0 and second time its 1
    // third times it is 2

    if (promises.length > 0) {
        await Promise.all(promises);
    }

    if (count > 5) {
        throw new ValidationError(`Too many OTP requests! Please wait 1 hour before tryagain.`)

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





export const otprequest = async (phone_number) => {

    try {
        // Check otp restircation
        await checkOtpRestrication(phone_number);
        await trackOtpRequests(phone_number);


        const otp = crypto.randomInt(1000, 9999).toString();

        const promise = []


        promise.push(redis.set(`otp:${phone_number}`, otp, "EX", 300))
        promise.push(redis.set(`otp_cooldown:${phone_number}`, "true", "EX", 60))

        await Promise.all(promise)



        // Add to BullMQ ( The heavy lifting happens later)
        await sendotp(phone_number , otp)




    } catch (error) {
        throw new ValidationError(`Error sending OTP ${error.message}`)


    }





}

export const savedata = async (name, phone_number, role) => {
    try {  
        let user = null ;



        if (role === "Consumer") {
             user = await prisma.user_customer.create({
                data: {
                    name,
                    phone_number
                }
            })
        }
        else if (role === "Electrician") {
            user = await prisma.electrician_customer.create({
                data: {
                    name,
                    phone_number,
                    reffreal_code: generateReferralCode(name, phone_number)
                }
            })
        }else{
            throw new ValidationError(`There Role is not Error`)
        }

        return user;


    }
    catch (error) {
        if (error.code === 'P2002') {
            throw new ValidationError("User already exists.");
        }
        throw new ValidationError(`Error saving data: ${error.message}`);


    }
}

