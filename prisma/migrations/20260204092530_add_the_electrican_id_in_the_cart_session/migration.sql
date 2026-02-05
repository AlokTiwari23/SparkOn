-- DropForeignKey
ALTER TABLE "cart_sessions" DROP CONSTRAINT "cart_sessions_customer_id_fkey";

-- AlterTable
ALTER TABLE "cart_sessions" ADD COLUMN     "electrician_id" INTEGER,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "cart_sessions" ADD CONSTRAINT "cart_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "user_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_sessions" ADD CONSTRAINT "cart_sessions_electrician_id_fkey" FOREIGN KEY ("electrician_id") REFERENCES "electrician_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
