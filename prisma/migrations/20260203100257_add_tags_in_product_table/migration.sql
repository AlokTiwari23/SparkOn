-- AlterTable
ALTER TABLE "products" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
