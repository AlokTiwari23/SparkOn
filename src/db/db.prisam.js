import { Pool } from 'pg';
// 1. Change PrismaNeon to PrismaPg
import { PrismaPg } from '@prisma/adapter-pg'; 
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });

// 2. Use PrismaPg here as well
const adapter = new PrismaPg(pool); 
const prisma = new PrismaClient({ adapter });

export default prisma;