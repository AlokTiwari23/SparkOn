/*
  Warnings:

  - The values [ELECTRICIAN,CUSTOMER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `image_public_id` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('Electrician', 'customer', 'Admin');
ALTER TABLE "user_addresses" ALTER COLUMN "user_type" TYPE "UserRole_new" USING ("user_type"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "image_public_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER,
    "electrician_id" INTEGER,
    "title" VARCHAR(100) NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "user_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_electrician_id_fkey" FOREIGN KEY ("electrician_id") REFERENCES "electrician_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
