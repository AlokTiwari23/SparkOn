// Download the helper library from https://www.twilio.com/docs/node/install
import twilio from "twilio" // Or, for ESM: import twilio from "twilio";
import { ValidationError } from "../middlewares/errorHandler/index.js";
import dotenv from "dotenv"
dotenv.config()


// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendotp(phone_number, otp) {

  const formated_phone_number = `+91${phone_number}`
  console.log(formated_phone_number)
  
  try {
    const message = await client.messages.create({
      body: `Vefication Code from Spark On : ${otp}`,
      from: +16815400764,
      to: formated_phone_number,

    });

  } catch (error) {
    throw new ValidationError(`Error sending OTP ${error.message}`)
  }

}




export default sendotp