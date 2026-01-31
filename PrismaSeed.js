import prisma from "./src/db/db.prisam.js"
// # Directly Add the Admin to the Database
import bcrypt from "bcryptjs"

const hashedPassword = await bcrypt.hash('Alok@2204', 10)
console.log(hashedPassword)