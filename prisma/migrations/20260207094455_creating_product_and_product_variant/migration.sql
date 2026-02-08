/*
  Warnings:

  - You are about to drop the column `brand_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price_mrp` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price_selling` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `specification` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `tax_rate_percent` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `inventory_stocks` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `gst_tax_per` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inventory_stocks" DROP CONSTRAINT "inventory_stocks_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- DropIndex
DROP INDEX "products_sku_key";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "brand_id",
DROP COLUMN "category_id",
DROP COLUMN "image_url",
DROP COLUMN "price_mrp",
DROP COLUMN "price_selling",
DROP COLUMN "sku",
DROP COLUMN "specification",
DROP COLUMN "tax_rate_percent",
ADD COLUMN     "brandId" INTEGER,
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "gst_tax_per" INTEGER NOT NULL;

-- DropTable
DROP TABLE "inventory_stocks";

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "sku" VARCHAR(20) NOT NULL,
    "price_mrp" DECIMAL(65,30) NOT NULL,
    "price_selling" DECIMAL(65,30) NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "image_url" TEXT,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
