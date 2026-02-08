import prisma from "./src/db/db.prisam.js"
// # Directly Add the Admin to the Database
import bcrypt from "bcryptjs"

const hashedPassword = await bcrypt.hash('***', 10)
console.log(hashedPassword)