

import { success } from "zod";
import prisma from "../db/db.prisam.js"
import { NotFoundError, ValidationError } from "../middlewares/errorHandler/index.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js";



// ==========================================
// 🚀 ADD NEW VARIANT TO EXISTING PRODUCT
// ==========================================
export const createProductVariant = async (req, res, next) => {
    let uploadedImagesData = [];

    try {
        const { 
            product_id, color, size_rating, sku, 
            price_selling, price_mrp, stock_quantity, boxpacking, moq 
        } = req.body;

        const imagesFiles = req.files;

        // 1. Validation
        if (!product_id || !price_selling || !stock_quantity || !boxpacking) {
            return next(new ValidationError("Required pricing and stock fields are missing"));
        }

        if (!imagesFiles || imagesFiles.length === 0) {
            return next(new ValidationError("At least 1 variant image is required"));
        }

        // 2. Ensure base product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: parseInt(product_id) }
        });

        if (!existingProduct) {
            return next(new NotFoundError("Base product not found"));
        }

        // 3. Third-Party Upload (Cloudinary)
        const uploadPromises = imagesFiles.map(file => uploadOnCloudinary(file.path));
        const uploadResult = await Promise.all(uploadPromises);
        
        uploadedImagesData = uploadResult.filter(img => img != null);

        if (uploadedImagesData.length === 0) {
            return next(new ValidationError("Failed to upload images to Cloudinary"));
        }

        const imagesUrls = uploadedImagesData.map(img => img.secure_url);

        // 4. Write to Database
        const newVariant = await prisma.productVariant.create({
            data: {
                product_id: parseInt(product_id), // Link to base product
                sku: sku || `VAR-${Date.now()}`,         
                color: color || null,
                size_rating: size_rating || null,
                price_selling: parseFloat(price_selling),        
                price_mrp: price_mrp ? parseFloat(price_mrp) : parseFloat(price_selling), 
                stock_quantity: parseInt(stock_quantity),         
                boxpacking: parseInt(boxpacking),        
                moq: moq ? parseInt(moq) : 1,            
                images: imagesUrls
            }
        });

        // 5. Success Response
        res.status(201).json({
            success: true,
            message: "Variant added successfully",
            result: newVariant
        });

    } catch (error) {
        // Cleanup: Delete images from Cloudinary if database fails
        if (uploadedImagesData.length > 0) {
            console.log("Database write failed. Cleaning up Cloudinary images...");
            const deletePromises = uploadedImagesData.map(img => deleteFromCloudinary(img.public_id));
            await Promise.all(deletePromises);
        }
        
        next(error);
    }
}


export const createBanner = async (req, res, next) => {
    try {
        // Check if Image filr exists (Multer puts it in req.file)
        // Note: Inyour route , use : upload.single('banner')

        const localFilePath = req.file?.path;

        if (!localFilePath) {
            return next(new ValidationError("Banner image is required"))
        }
        // 2. Upload to Cloudinary
        const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

        if (!cloudinaryResponse) {
            return next(new ValidationError("Failed to upload image to cloud"))
        }

        // 3. Get Metadata from Body
        const { title, targetScreen, targetId } = req.body;

        // 4. Create Entry in DataBase

        const banner = await prisma.banner.create({
            data: {
                imageUrl: cloudinaryResponse.secure_url,
                publicId: cloudinaryResponse.public_id, // Impoartant for deleting later
                title: title || "Home Banner",
                targetScreen: title || "Home",  // Default to just staying on home
                targetId: targetId || ""
            }
        });

        // 5.Send Response

        res.status(201).json({
            success: true,
            message: "Banner created successfully",
            banner
        });

    } catch (error) {
        //  Pass to your Error Middleware

        next(error);

    }
}


export const deleteBanner = async (req, res, next) => {
    try {

        const { id } = req.params;

        // 1. Find the banner first
        const banner = await prisma.banner.findUnique({
            where: { id }
        })

        if (!banner) {
            return next(new ValidationError("Banner not Found"));
        }

        // 2. Delete Image from Cloudinary 
        // We use the 'publicId' we saved during creation

        if (banner.publicId) {
            await deleteFromClodinary(banner.publicId)
        }

        // Delete Record from Database
        await prisma.banner.delete({
            where: { id }
        })

        res.status(200).json({
            success: true,
            message: "Banner deleted successfully"
        })

    } catch (error) {
        next(error)

    }
}


export const getHomeBanner = async (req, res, next) => {
    try {
        const banner = await prisma.banner.findMany({
            where: { isActive: true },
            select: {
                id: true,
                imageUrl: true,
                targetScreen: true,
                targetId: true,
                title: true
            }
        })

        res.status(200).json({
            success: true,
            banner
        })

    } catch (error) {
        next(error)
    }
}


export const getNewArrival = async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                // Return basic details for the card
                images: { take: 1 },
                brand: { select: { name: true } }
            }
        })

        res.status(200).json({
            success: true,
            products
        })

    } catch (error) {
        next(error)
    }
}


export const getTredingNow = async (req, res, next) => {
    try {

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                isFeatured: true  // You can toggle this flag in Admin to make itrms trending
            },
            take: 10,
            include: {
                images: { take: 1 },
                brand: { select: { name: true } }
            }
        })

    } catch (error) {
        next(error)
    }
}


export const updateProductMarketingTags = async (req, res, next) => {

    try {

        const { id } = req.params;
        const { tags } = req.body;

        if (!Array.isArray(tags)) {
            return next(new ValidationError("Tags must be an array of strings"))
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                tags: tags
            }
        });

        res.status(200).json({
            success: true,
            message: "Product tags updated successfully"
        })

    } catch (error) {
        next(error)
    }


}

// Ger Seasonal Picks (Public)
// Fetch product that have the Seasonal tag

export const getSeasonPicks = async (req, res, next) => {
    try {

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                tags: { has: "Seasonal" } // prisma filter for Array
            },
            take: 10,
            include: {
                images: { take: 1 }
            }
        });
        res.status(200).json({
            success: true,
            products
        })



    } catch (error) {
        next(error)
    }
}


// Category Controllers

export const createCategory = async (req, res, next) => {


    try {
        // Grab parent_id from the frontend
        const { name, parent_id } = req.body;


        if (!name) {
            return next(new ValidationError("Category name is required"));
        }


        const existingCategory = await prisma.category.findUnique({
            where: { name: name }
        });

        if (existingCategory) {
            return next(new ValidationError("Category name already exists"));
        }





        // Convert parent_id to a number, or leave it null if not provided
        const parsedParentId = parent_id ? parseInt(parent_id, 10) : null;

        const category = await prisma.category.create({
            data: {
                name,

            }
        });

        return res.status(201).json({
            success: true,
            message: "Category Created Successfully",
            category
        });

    } catch (error) {
        if (uploadedImage?.public_id) {
            console.log("Creation failed. Deleting orphan category image...");

        }
        return next(error);
    }
};


export const getAllCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            // 1. FIXED: Changed isActive to is_active
            where: { is_active: true },

            // 2. FIXED: Changed image to image_url to match your schema
            select: { id: true, name: true }
        });

        res.status(200).json({
            success: true,
            categories
        });

    } catch (error) {
        next(error);
    }
};


// Brand Controllers


export const createBrand = async (req, res, next) => {
    // 1. Declare OUTSIDE try block (for cleanup in catch)
    let uploadedImage = null;

    try {
        const { name } = req.body;
        const localFilePath = req.file?.path;

        // ==========================================
        // STEP 1: Fast Synchronous Validation
        // ==========================================
        if (!name) {
            return next(new ValidationError(`Brand Name is Required`)); // Added return!
        }

        if (!localFilePath) {
            return next(new ValidationError(`Brand logo/image is required`)); // Added return!
        }

        // ==========================================
        // STEP 2: Database Validation
        // ==========================================
        const existingBrand = await prisma.brand.findUnique({
            where: { name: name }
        });

        if (existingBrand) {
            return next(new ValidationError(`Brand Name Already Exists`)); // Added return!
        }

        // ==========================================
        // STEP 3: Third-Party Upload (Expensive)
        // ==========================================
        uploadedImage = await uploadOnCloudinary(localFilePath);

        if (!uploadedImage) {
            return next(new ValidationError(`Failed to upload image to Cloudinary`)); // Added return!
        }

        // ==========================================
        // STEP 4: Database Write
        // ==========================================
        const brand = await prisma.brand.create({
            data: {
                name,
                image_url: uploadedImage.secure_url,
                image_public_id: uploadedImage.public_id
            }
        });

        // ==========================================
        // STEP 5: Success Response
        // ==========================================
        // 201 is the standard HTTP status for "Created"
        return res.status(201).json({
            success: true,
            message: "Brand Created Successfully",
            brand
        });

    } catch (error) {
        // --- Cleanup Safety Net ---
        // If DB failed but image uploaded, delete the image
        if (uploadedImage?.public_id) {
            console.log("Database creation failed. Deleting orphan image from Cloudinary...");
            await deleteFromCloudinary(uploadedImage.public_id);
        }

        return next(error);
    }
};

export const getAllBrand = async (req, res, next) => {
    try {

        const brands = await prisma.brand.findMany({
            where: { is_active: true },
            select: { id: true, name: true, image_url: true }
        })

        res.status(200).json({
            success: true,
            brands
        })



    } catch (error) {
        next(error)
    }
}


// Product Management

// 1. Create Product (Handles Multiple Images)

export const createProduct = async (req, res, next) => {
    let uploadedImagesData = [];

    try {
        // 1. Extract ALL fields from the frontend
        const {
            name, description, categoryId, brandId,
            price, mrp, stock, sku, hsnCode, isFeatured,
            boxpacking, gst_tax_per, moq, uom, warranty, is_isi_marked, color, size_rating
        } = req.body;

        // 2. Parse Tags
        let parsedTags = req.body.tags || [];
        if (typeof parsedTags === 'string') { parsedTags = [parsedTags]; }

        const imagesFiles = req.files;

        // 3. Validation (Ensure both Base and Variant required fields exist)
        if (!name || !description || !categoryId || !brandId || !price || !stock || !boxpacking) {
            return res.status(400).json({ success: false, message: "Required fields are missing" });
        }

        if (!imagesFiles || imagesFiles.length === 0) {
            return res.status(400).json({ success: false, message: "At least 1 product image is required" });
        }

        // 4. Upload Images to Cloudinary (These belong to the Variant now)
        const uploadPromises = imagesFiles.map(file => uploadOnCloudinary(file.path));
        const uploadResult = await Promise.all(uploadPromises);
        uploadedImagesData = uploadResult.filter(img => img != null);

        if (uploadedImagesData.length === 0) {
            return res.status(500).json({ success: false, message: "Image upload failed completely" });
        }

        const imagesUrls = uploadedImagesData.map(img => img.secure_url);

        // 5. Save to Database using a Transaction
        const result = await prisma.$transaction(async (tx) => {

            // STEP A: Create the Base Product
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    category: {
                        connect: { id: parseInt(categoryId) }
                    },
                    brand: {
                        connect: { id: parseInt(brandId) }
                    },
                    hsnCode: hsnCode || null,
                    is_featured: isFeatured === 'true',
                    uom: uom || "Piece",
                    warranty: warranty || null,
                    is_isi_marked: is_isi_marked === 'true',
                    tags: parsedTags,
                    gst_tax_per: gst_tax_per ? parseInt(gst_tax_per) : null,
                    is_active: true
                }
            });

            // STEP B: Create the Default Variant linked to the new Product
            const newVariant = await tx.productVariant.create({
                data: {
                    product_id: newProduct.id,               // 👈 Links to Base Product
                    sku: sku || `SKU-${Date.now()}`,         // Auto-generate if blank
                    price_selling: parseFloat(price),        // Moved here
                    price_mrp: mrp ? parseFloat(mrp) : parseFloat(price),
                    stock_quantity: parseInt(stock),         // Moved here
                    boxpacking: parseInt(boxpacking),        // Moved here
                    moq: moq ? parseInt(moq) : 1,            // Moved here
                    images: imagesUrls,                      // Moved here
                    color: color || "Default",                        // Default value
                    size_rating: size_rating || "Default"                   // Default value
                }
            });

            return { product: newProduct, variant: newVariant };
        });

        res.status(201).json({
            success: true,
            message: `Product and Default Variant created successfully`,
            result
        });

    } catch (error) {
        console.error("Product Creation Error:", error);

        // Cleanup images if database fails
        if (uploadedImagesData.length > 0) {
            const deletePromises = uploadedImagesData.map(img => deleteFromCloudinary(img.public_id));
            await Promise.all(deletePromises);
        }

        res.status(500).json({
            success: false,
            message: `Product Creation Failed: ${error.message}`
        });
    }
}

// Update Product (Full Edit)

export const updateProduct = async (req, res, next) => {
    let newUploadedImageData = [];

    try {
        const { id } = req.params;
        // 1. Extract Base Product Text
        const { name, description, categoryId, brandId, tags, base_images_to_keep, variants } = req.body;
        
        // upload.any() puts ALL files in an array called req.files.
        const allFiles = req.files || [];

        const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!existingProduct) return next(new NotFoundError(`Product not found`));

        const parsedTags = tags ? JSON.parse(tags) : [];
        const parsedVariants = variants ? JSON.parse(variants) : [];

        // ==========================================
        // 🖼️ 2. PROCESS BASE PRODUCT IMAGES
        // ==========================================
        let finalBaseImages = base_images_to_keep ? JSON.parse(base_images_to_keep) : [];
        
        // Find files meant for base product
        const baseNewFiles = allFiles.filter(f => f.fieldname === 'base_images');
        
        if (baseNewFiles.length > 0) {
            const uploadPromises = baseNewFiles.map(f => uploadOnCloudinary(f.path));
            const results = await Promise.all(uploadPromises);
            const urls = results.filter(img => img != null).map(img => img.secure_url);
            finalBaseImages = [...finalBaseImages, ...urls];
        }

        // ==========================================
        // 💾 3. DATABASE TRANSACTION
        // ==========================================
        const result = await prisma.$transaction(async (tx) => {
            
            // A. Update Parent Product
            const updatedProduct = await tx.product.update({
                where: { id: parseInt(id) },
                data: {
                    name, description, tags: parsedTags, images: finalBaseImages,
                    categoryId: categoryId ? parseInt(categoryId) : undefined,
                    brandId: brandId ? parseInt(brandId) : undefined
                }
            });

            // B. Update Every Variant
            for (let i = 0; i < parsedVariants.length; i++) {
                const v = parsedVariants[i];
                if (!v.id) continue; // Only updating existing variants here

                // Image Logic for THIS specific variant
                let variantFinalImages = v.images_to_keep || [];
                
                // Find files explicitly uploaded for this variant index
                const variantFiles = allFiles.filter(f => f.fieldname === `variant_${i}_images`);
                
                if (variantFiles.length > 0) {
                    const vUploadPromises = variantFiles.map(f => uploadOnCloudinary(f.path));
                    const vResults = await Promise.all(vUploadPromises);
                    const vUrls = vResults.filter(img => img != null).map(img => img.secure_url);
                    variantFinalImages = [...variantFinalImages, ...vUrls];
                }

                // Save Variant
                await tx.productVariant.update({
                    where: { id: parseInt(v.id) },
                    data: {
                        color: v.color,
                        sku: v.sku,
                        size_rating: v.size_rating,
                        stock_quantity: parseInt(v.stock_quantity),
                        price_mrp: parseFloat(v.price_mrp),
                        price_selling: parseFloat(v.price_selling),
                        images: variantFinalImages
                    }
                });
            }

            return updatedProduct;
        });

        res.status(200).json({ success: true, message: `Everything updated successfully`, product: result });

    } catch (error) {
        console.error("Update Error:", error);
        // Note: In a production environment with multi-file uploads, 
        // thorough Cloudinary rollback logic goes here if TX fails.
        next(error);
    }
};

// 3. Quick  Stock Update (Fast!)
// Use this whne new inventory arrives

export const updateProductStock = async (req, res, next) => {
    try {
        const { id } = req.params; // 👈 Grab the ID from the URL (/:id/stock)
        const { adjustment } = req.body; // 👈 Grab only the adjustment from the body

        if (!adjustment || isNaN(adjustment)) {
            return res.status(400).json({ success: false, message: "Valid adjustment amount is required" });
        }

        const action = adjustment > 0 ? 'increment' : 'decrement';
        const value = Math.abs(parseInt(adjustment));

        const updatedVariant = await prisma.productVariant.update({
            where: { id: parseInt(id) }, // 👈 Use the parsed ID here
            data: {
                stock_quantity: {
                    [action]: value // Prisma magic: atomically adds/removes 🪄
                }
            }
        });

        res.status(200).json({
            success: true,
            message: `Stock adjusted by ${adjustment}`,
            data: updatedVariant
        });

    } catch (error) {
        next(error);
    }
}


export const updateProductPrice = async (req, res, next) => {
    try {

        // Get the Variant ID (Not Product ID)

        const { id } = req.params;
        const { price_selling, price_mrp } = req.body;

        // Update the Variant Table
        const updatedVariant = await prisma.productVariant.update({
            where: { id: parseInt(id) },
            data: {
                price_selling: parseFloat(price_selling),
                price_mrp: parseFloat(price_mrp)
            }
        });

        res.status(200).json({
            success: true,
            message: "Price updated successfully",
            data: updatedVariant
        });

    } catch (error) {
        next(error)
    }
}

// 5. Delete Product (Soft Delete)
// We set isActive = false . We don't delete the row,
// because previous Orders still refrence this product Id.

export const deleteProduct = async (req, res, next) => {
    try {

        const { id } = req.params;

        await prisma.product.update({
            where: { id },
            data: { is_active: false }
        })

        res.status(200).json({
            success: true,
            message: "Product deactivated successfully"
        })

    } catch (error) {
        next(error)
    }
}

//  Get all Product's

export const getAllProduct = async (req, res, next) => {
    try {
        const {
            keyword, categoryId, brandId, minPrice, maxPrice, sort,
            page = 1, limit = 10
        } = req.query;

        // 1. Build the 'WHERE' clause dynamically
        const whereClause = { is_active: true };

        // 2. Search Logic (Name or SKU inside variants)
        if (keyword) {
            whereClause.OR = [
                { name: { contains: keyword, mode: 'insensitive' } },
                // 👇 Better search: Also search by Variant SKU!
                { variants: { some: { sku: { contains: keyword, mode: 'insensitive' } } } }
            ];
        }

        if (categoryId) whereClause.categoryId = parseInt(categoryId);
        if (brandId) whereClause.brandId = parseInt(brandId);

        // 3. Price Range Filter
        if (minPrice || maxPrice) {
            whereClause.variants = {
                some: {
                    price_selling: {
                        gte: minPrice ? parseFloat(minPrice) : undefined,
                        lte: maxPrice ? parseFloat(maxPrice) : undefined
                    }
                }
            };
        }

        // 4. Pagination Math
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 5. Execute Queries
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                orderBy: { id: 'desc' }, // Swapped to ID since createdAt isn't in your Product schema
                skip: skip,
                take: limitNum,
                include: {
                    brand: { select: { name: true } },
                    category: { select: { name: true } },
                    variants: true // 👈 Fetch all variants so the frontend can expand the row
                }
            }),
            prisma.product.count({ where: whereClause })
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: pageNum,
            products: products // 👈 Send the raw products with their nested variants
        });

    } catch (error) {
        next(error);
    }
}


export const getProductSuggestion = async (req, res, next) => {
    try {

        const { q } = req.query;  // User typese '?q=poly

        if (!q) return res.status(200).json({
            suggestions: []
        })

        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                name: { contains: q, mode: 'insensitive' }

            },
            select: {
                id: true, name: true
                //  Only fetch names for speed
            },
            take: 5 // Limit to top 5 suggestions
        });

        res.status(200).json({
            success: true,
            suggestions: products
        })

    } catch (error) {
        next(error)
    }
}

// export const getProductDetails = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         // Fetch Prduct with All details
//         const product = await prisma.product.findUnique({
//             where: { id },
//             include: {
//                 brand: true,
//                 category: true,
//                 image: true,
//                 // If you add Reviews table:
//                 //  reviews :{take: 3 , orderBy :{
//                 // createdAt : 'desc'}}
//             }
//         });

//         if (!product) {
//             return next(new ValidationError("Product not Found"))
//         }

//         //2 .Fetch Related Products (Smae , Excluding current one)
//         const relatedProducts = await prisma.product.findMany({
//             where: {
//                 categoryId: product.categoryId,
//                 id: { not: product.id }, // Exclude current
//                 isActive: true
//             },
//             take: 4,
//             include: { image: { take: 1 } }
//         })


//         // 3. Calculate Discount Math (Backend Logic)

//         let discountPercentage = 0;
//         let SaveAmount = 0;

//         if (product.mrp > product.price) {
//             saveAmount = product.mrp - product.price;
//             discountPercentage = Math.round((saveAmount / product.mrp))
//         }

//         // 4. Construct Offers (Hardcoded for now . or fetch from db)
//         const offers = [];
//         if (discountPercentage > 10) {
//             offers.push({ title: "Greate Price", description: `You save ₹${saveAmount} on this tiem !` });
//         }

//         offers.push({ title: "Band Offer", description: "5% Unlimited Cashback on Axis Bank Cards" })

//         // 5. Send Final Response 
//         res.status(200).json({
//             success: true,
//             product: {
//                 ...product,
//                 discountPercentage,
//                 saveAmount,
//                 availableOffers: offers
//             },
//             relatedProducts
//         })

//     } catch (error) {
//         next(error)
//     }
// }

// 🏷️ GET DEALS (High Discount Items)


export const getProductDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Fetch Product with VARIANTS
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                brand: true,
                category: true,
                variants: true, // 👈 CRITICAL: Fetch variants to get the price
                // images: true (NOT needed if images is just a String[] array, Prisma fetches it automatically)
            }
        });

        if (!product) {
            return next(new NotFoundError("Product not Found"));
        }

        // 2. Select the "Default" Variant to show pricing
        // (Usually the first one, or the cheapest one)
        const defaultVariant = product.variants[0];

        // Handle case where product has no variants (Edge case)
        if (!defaultVariant) {
            return next(new ValidationError("Product exists but has no variants/prices set."));
        }

        // 3. Calculate Discount Math (Using the Default Variant)
        let discountPercentage = 0;
        let saveAmount = 0; // Fixed typo: SaveAmount -> saveAmount

        // Ensure numbers are numbers (Prisma decimals can be tricky)
        const mrp = Number(defaultVariant.price_mrp);
        const selling = Number(defaultVariant.price_selling);

        if (mrp > selling) {
            saveAmount = mrp - selling;
            discountPercentage = Math.round((saveAmount / mrp) * 100);
        }

        // 4. Fetch Related Products
        const relatedProducts = await prisma.product.findMany({
            where: {
                categoryId: product.categoryId,
                id: { not: product.id }, // Exclude current
                is_active: true
            },
            take: 4,
            include: {
                // We need variants here too, to show "Price" on the related card
                variants: {
                    select: { price_selling: true },
                    take: 1
                }
            }
        });

        // 5. Clean up Related Products (Flatten the price)
        const cleanRelated = relatedProducts.map(p => ({
            id: p.id,
            name: p.name,
            image: p.images[0] || null, // Pick first image
            price: p.variants[0]?.price_selling || 0 // Pick price
        }));

        // 6. Construct Offers
        const offers = [];
        if (discountPercentage > 10) {
            offers.push({
                title: "Great Price",
                description: `You save ₹${saveAmount} on this item!`
            });
        }
        offers.push({
            title: "Bank Offer",
            description: "5% Unlimited Cashback on Axis Bank Cards"
        });

        // 7. Send Final Response 
        res.status(200).json({
            success: true,
            product: {
                ...product,
                // Overwrite the missing root fields with Variant data for easy frontend use
                price: selling,
                mrp: mrp,
                discountPercentage,
                saveAmount,
                availableOffers: offers,
                // Keep the raw variants array so user can select "Blue" or "Red"
                variants: product.variants
            },
            relatedProducts: cleanRelated
        });

    } catch (error) {
        next(error);
    }
}


export const getDeals = async (req, res, next) => {
    try {
        // Logic: Find products where Selling Price is significantly lower than MRP
        // We can't do complex math in 'findMany', so we fetch active items and filter or just sort by a 'discount' field if you added one.
        // Ideally, you should store 'discount_percent' in DB to sort easily.
        // For now, let's just return products with a manual 'isDeal' flag or just random active ones.

        const products = await prisma.product.findMany({
            where: { isActive: true },
            take: 12,
            orderBy: { price: 'asc' }, // Cheapest items first as "Deals"
            include: { images: { take: 1 } }
        });

        res.status(200).json({ success: true, products });
    } catch (error) { next(error); }
};

// 🔄 TOGGLE PRODUCT STATUS (Active <-> Inactive)
export const toggleProductStatus = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (!product) return next(new ValidationError("Product not found"));

        const updatedProduct = await prisma.product.update({
            where: { id: parseInt(id) },
            data: { isActive: !product.isActive } // Flip the status
        });

        res.status(200).json({
            success: true,
            message: `Product is now ${updatedProduct.isActive ? 'Active' : 'Inactive'}`,
            isActive: updatedProduct.isActive
        });
    } catch (error) { next(error); }
};

// 📦 BULK RULES (Set Min Qty / Case Qty)
// Since we don't have a separate "BulkRule" table in your last schema, 
// we will assume this updates the Product's own bulk fields.
export const updateBulkRules = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { min_order_qty, case_qty } = req.body;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                min_order_qty: min_order_qty ? parseInt(min_order_qty) : undefined,
                case_qty: case_qty ? parseInt(case_qty) : undefined
            }
        });

        res.status(200).json({
            success: true,
            message: "Bulk buying rules updated",
            product
        });
    } catch (error) { next(error); }
};

// 🗑️ DELETE BULK RULE (Reset to Default)
export const deleteBulkRule = async (req, res, next) => {
    try {
        const { id } = req.params; // Using Product ID since rules are on the product

        await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                min_order_qty: 1, // Reset to default
                case_qty: 1       // Reset to default
            }
        });

        res.status(200).json({ success: true, message: "Bulk rules reset to default" });
    } catch (error) { next(error); }
};

