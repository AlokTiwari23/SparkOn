import crypto from "crypto";
import { ValidationError } from "../middlewares/errorHandler/index.js";
import redis from "../db/redis.js";
import { sendotp } from "./send-phone-otp.js";




export const validateRegistrationData = (phone_number) => {

    if (!/^[6-9]\d{9}$/.test(phone_number)) {
            throw new ValidationError("Invalid Indian phone number");
        }
};

export const checkOtpRestrication = async (phone_number) => {
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


export const trackOtpRequests = async (phone_number) => {

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

export const sendotpcode = async (phone_number) => {
    // 4 digit otp
    try {
        const otp = crypto.randomInt(1000, 9999).toString();

        await redis.set(`otp:${phone_number}`, otp, "EX", 300); // expirty of the otp 300
        await redis.set(`otp_cooldown:${phone_number}`, "true", "EX", 60); // you can sent the otp in the timestamp of the 1 min

        // setImmediate(() => {
        //     try {
        //         sendemail(email, "Verify your Email and Make Your Home Brighter -- Spark On", template, { // 1. Name of your App
        //             companyName: "Spark On",
        //             userName: name,
        //             otp: otp,
        //             companyUrl: "http://localhost:3000"
        //         })
        //     } catch (error) {
        //         throw new ValidationError(`Error sending email ${error.message}`)
        //     }

        // })

        sendotp(`+91${phone_number}`)



    } catch (error) {
        throw new ValidationError(`Error sending OTP ${error.message}`)
    }

}


export const verifyOtp = async (email, otp) => {
    const lockKey = `otp_lock:${email}`;
    const otpKey = `otp:${email}`;
    const attemptKey = `otp_attempts:${email}`;

    // 🔹 Use pipeline (1 round-trip)
    const pipeline = redis.multi();
    pipeline.get(lockKey);
    pipeline.get(otpKey);
    pipeline.get(attemptKey);

    const [[, isLocked], [, storedOtp], [, attempts]] = await pipeline.exec();

    if (isLocked) {
        throw new ValidationError("Account locked. Try again after 30 minutes.");
    }

    if (!storedOtp) {
        throw new ValidationError("Invalid or expired OTP");
    }

    if (storedOtp !== otp) {
        const attempt = (parseInt(attempts || "0", 10)) + 1;

        const failPipeline = redis.multi();

        if (attempt >= 3) {
            failPipeline.set(lockKey, "locked", "EX", 1800);
            failPipeline.del(otpKey, attemptKey);
        } else {
            failPipeline.set(attemptKey, attempt, "EX", 300);
        }

        await failPipeline.exec();

        throw new ValidationError(
            attempt >= 3
                ? "Too many attempts. Account locked for 30 minutes."
                : `Incorrect OTP. ${3 - attempt} attempts left.`
        );
    }

    // ✅ Success cleanup
    await redis.del(otpKey, attemptKey);
    return true;
};






