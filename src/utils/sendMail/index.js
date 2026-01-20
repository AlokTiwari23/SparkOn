import nodemailer from "nodemailer";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import { ValidationError } from "../../middlewares/errorHandler/index.js";

dotenv.config();

const traspoter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    pool:true,
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,

    }
});

const renderEmailTemplate = async (template, data) => {
    const templatePath = path.join(
        process.cwd(),
        "src",
        "utils",
        "email-templates",
        `${template}.ejs`
    )

    return ejs.renderFile(templatePath, data)

}

//send an email

export const sendemail = async (email, subject, template, data) => {

    try {
        const html = await renderEmailTemplate(template, data);
        await traspoter.sendMail({
            from: process.env.SMTP_MAIL,
            to:email,
            subject:subject,
            html:html
        })
        return true
        
    } catch (error) {
        throw new ValidationError(`Error sending email ${error}`)
        
    }
}








