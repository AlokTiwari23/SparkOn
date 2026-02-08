
import { success } from "zod";
import prisma from "../db/db.prisam.js"
import { NotFoundError, ValidationError } from "../middlewares/errorHandler/index.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/Cloudinary.js";
import { file } from "pdfkit";
import { Promise } from "mongoose";



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

        const { name } = req.body;

        // Image comes from multer -> Cloudinary

        const localFilePath = req.file?.path;

        if (!name) return next(new ValidationError("Category name is required"))
        if (!localFilePath) {
            return next(new ValidationError(`Image is not Provided`))
        }

        let imageUrl = "";

        if (localFilePath) {
            const response = await uploadOnCloudinary(localFilePath);
            if (response) {
                imageUrl = response
            }
        } else {
            return next(new ValidationError(`There is Not any File`))
        }

        const category = await prisma.category.create({
            data: { name, image_url: imageUrl.secure_url, image_public_id: imageUrl.public_id } // For the Help in the Deleted
        })

        res.status(201).json({
            success: true,
            category
        })
    } catch (error) {

        // CleanUp : If we uploaded an image, Delete It immediatly
        if (imageUrl && imageUrl.public_id) {
            await deleteFromCloudinary(imageUrl.public_id)
        }

        return res.status(500).json({
            error: "Category Creation failed"
        })
    }
}


export const getAllCategories = async (req, res, next) => {
    try {

        const categories = await prisma.category.findMany({
            where: { isActive: true },
            select: { id: true, name: true, image: true } // Only Send what needed for icons
        })

        res.status(200).json({
            success: true,
            categories
        })

    } catch (error) {
        next(error)
    }
}


// Brand Controllers


export const createBrand = async (req, res, next) => {
    // 1. Declare OUTSIDE try block (for cleanup in catch)
    let uploadedImage = null;

    try {
        const { name } = req.body;
        const localFilePath = req.file?.path;

        if (!name) {
            next(new ValidationError(`Brand Name is Required`))
        }

        const existingBrand = await prisma.brand.findUnique({
            where: { name: name }
        });

        if (existingBrand) {
            next(new ValidationError(`Brand Name is Already Exists`))
        }

        if (!localFilePath) {
            next(new ValidationError(`Brand logo/image is required`))
        }

        uploadedImage = await uploadOnCloudinary(localFilePath);

        if (!uploadedImage) {
            next(new ValidationError(`Failed to upload image to Cloudinary`))
        }
        const brand = await prisma.brand.create({
            data: {
                name,
                image_url: uploadedImage.secure_url,
                image_public_id: uploadedImage.public_id
            }
        });

        // --- Success Response ---
        return res.status(200).json({
            success: true,
            message: "Brand Created Successfully",
            brand
        })

    } catch (error) {
        // --- Cleanup Safety Net ---
        // If DB failed but image uploaded, delete the image
        if (uploadedImage?.public_id) {
            console.log("Creation failed. Deleting orphan image...");
            await deleteFromCloudinary(uploadedImage.public_id);
        }

        next(error);
    }
}

export const getAllBrand = async (req, res, next) => {
    try {

        const brands = await prisma.brand.findMany({
            where: { isActive: true },
            select: { id: true, name: true, logo: true }
        })

    } catch (error) {
        next(error)
    }
}


// Product Management

// 1. Create Product (Handles Multiple Images)

export const createProduct = async (req, res, next) => {
    try {
        // Extract Text Data 
        const { name, description, categoryId, brandId, tags, variants } = req.body
        const imagesFiles = req.files; // ONly 1 file now
        //  Validate Basic Fields 
        if (!name || !variants || !localFilePath || !description || !categoryId || !brandId || !tags) {
            return next(new ValidationError("Name and Variants are required"))
        }
        if (!imagesFiles || imagesFiles.length === 0) {
            return next(new ValidationError(`At least 1 product image is required`))
        }
        // Upload All Images in Parallel
        // We map the files to upload Promises
        const uploadPromises = imagesFiles.map(file => uploadOnCloudinary(file.path));
        // We await them all together
        const uploadResult = await Promise.all(uploadPromises)
        // Store the FULL objects (public_id + secure_url) in our outer variable
        uploadedImagesData = uploadResult.filter(img => img != null);

        // If no images succeeded , stop here
        if (uploadedImagesData.length === 0) {
            return next(new ValidationError("Image upload failed completely"));
        }
        // Extract just the secure_urls (filter out any failed nulls) 
        // The Clean Array (Just String)
        const imagesUrls = uploadResult
            .filter(img => img != null)
            .map(img => img.secure_url);

        // Prase Variant (String -> Object)
        const parsedVariants = variants ? JSON.parse(variants) : [];
        const parsedTags = tags ? JSON.parse(tags) : [];

        // Transaction : Save Product + Save Variants
        const result = await prisma.$transaction(async (tx) => {
            // Create the Parent Product (With the Image)
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    categoryId: parseInt(categoryId),
                    brandId: parseInt(brandId),
                    images: imagesUrls,
                    tags: parsedTags,
                    is_active: true
                }
            });
            // Bulk Create Variants (Only Data , No Images)
            if (parsedVariants.length > 0) {
                // Map the data to add the new 'product_id'
                const variantsData = parsedVariants.map(v => ({
                    product_id: newProduct.id,
                    color: v.color,
                    sku: v.sku,
                    stock_quantity: parseInt(v.stock_quantity),
                    price_mrp: parseFloat(v.price_mrp),
                    price_selling: parseFloat(v.price_selling)
                }));
                await tx.productVariant.createMany({
                    data: variantsData
                })
            }
            return newProduct
        })
        res.status(201).json({
            success: true,
            message: `Product created with variants`,
            result
        })
    } catch (error) {
        if (uploadedImagesData.length > 0) {
            // Delete all image in parallel
            const deletePromise = uploadedImagesData.map(img => {
                deleteFromCloudinary(img.public_id)
            });

            await Promise.all(deletePromise)
        }
        res.status(500).json({
            success: false,
            message: `Product Creation Falied`
        })
    }
}


// Update Product (Full Edit)

export const updateProduct = async (req, res, next) => {

    let newUploadedImageData = [];

    try {

        const { id } = req.params;

        // Get Data from Body
        const {
            name, description, categoryId, brandId, tags, variants, images_to_keep  // Array of URLs the user wants to keep
        } = req.body
        
        const newImageFiles = req.files; //New files to add

        // Check if Product Exists
        const existingProduct  = await prisma.product.findUnique({
            where : { id: parseInt(id)},
            include : {variants :true}
        })

        if(!existingProduct) { 
            return next(new NotFoundError(`Product not found`))
        }

        // --- Image Logic Start ---

        // A. Handle "Keep" Images
        // IF user sends noting , assume they want to keep ALL existing images
        let finalImages = existingProduct.images ; 

        if(images_to_keep){
            // Parse because  FormData sends it as string : ["url1","url2"]
            const keepList = JSON.parse(images_to_keep)
            finalImages  = keepList ;

            // (Optional) Cleanup : Find images NOT in keepList and delete from Cloudinary
            // You would extract public_id here and call deleteFromCloudinary()
        }

        // Upload New Images

        if(newImageFiles && newImageFiles.length > 0){
            const uploadPromises = newImageFiles.map(file => uploadOnCloudinary(file.path) )
            const uploadResult = await Promise.all(uploadPromises)

            newUploadedImageData = uploadResult.filter(img => img != null);
            const newUrls = newUploadedImageData.map( img => img.secure_url);

            // Merge Old + New
            finalImages = [...finalImages , ...newUrls]
        }

        // --- Image Logic End ---

        // Prase JSON Fields
        const parsedTags = tags ? JSON.parse(tags) : undefined;
        const parsedVariants = variants ? JSON.parse(variants) : [];

        // 4. Transaction : Update Product & Upset Variants 
        // $transaction if Step2 fails not any thing run in the database
        const result = await prisma.$transaction(async(tx) => {
            // Step A: Update Parent Product
            const updateProduct = await tx.product.update({
                where : {id :parseInt(id)},
                data : {
                    name,
                    description,
                    categoryId : categoryId ? parseInt(categoryId) : undefined,
                    brandId : brandId ? parseInt(brandId) : undefined,
                    tags : parsedTags,
                    images : finalImages // Save the merged array
                }
            });

            // Step B : Handle Variants ( Upset Strategy)
            // We loop throught the sent variants
            //  if it has an ID -> Update it .
            // If it has no ID  - > Create it.

            if(parsedVariants.length > 0){
                for( const v of parsedVariants){
                    if(v.id){
                        // Update existing variant 
                        await tx.productVariant.update({
                            where : {id :parseInt(v.id)},
                            data: {
                                color : v.color ,
                                sku : v.sku,
                                stock_quantity  : parseInt ( v.price_mrp),
                                price_mrp : parseFloat(v.price_mrp),
                                price_selling : parseFloat(v.price_selling)
                            }
                        })
                    }else { 
                        // Create new variant (e.g user added "Red" color)
                        await tx.productVariant.create({
                            data : {
                                product_id : updateProduct.id,
                                color : v.color , 
                                sku : v.sku , 
                                stock_quantity : parseInt(v.stock_quantity),
                                price_mrp : parseFloat(v.price_mrp),
                                price_selling : parseFloat(v.price_selling)
                            }
                        })
                    }
                }
            }

            return updateProduct
        });

        res.status(200).json({
            success : true, 
            message : `Product update successfully`,
            result
        })

    } catch (error) {
        // Cleanup : If DB fails , delete the NEW images we just uploaded       
        if(newUploadedImageData.length > 0){
            const deletePromise = newUploadedImageData.map(img => deleteFromCloudinary(img.public_id));
            await Promise.all(deletePromise)
        }
        next(error)
    }

};

// 3. Quick  Stock Update (Fast!)
// Use this whne new inventory arrives

export const updateProductStock = async (req, res, next) => {
    try {
        const { variantId, adjustment } = req.body; 
        // Example: adjustment = 5 (Add 5) OR adjustment = -2 (Remove 2)

        const action = adjustment > 0 ? 'increment' : 'decrement';
        const value = Math.abs(parseInt(adjustment));

        const updatedVariant = await prisma.productVariant.update({
            where: { id: parseInt(variantId) },
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
    try{

        // Get the Variant ID (Not Product ID)

        const { id } =req.params;
        const {price_selling ,price_mrp} = req.body ;
        
        // Update the Variant Table
        const updatedVariant = await prisma.productVariant.update({
            where  :{ id : parseInt(id)},
            data : {
                price_selling : parseFloat(price_selling),
                price_mrp : parseFloat(price_mrp)
            }
        });

        res.status(200).json({
            success: true,
            message: "Price updated successfully",
            data: updatedVariant
        });

    }catch(error){
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

// export const getAllProduct = async (req, res, next) => {
//     try {

//         const {
//             keyword,
//             categoryId,
//             brandId,
//             minPrice,
//             maxPrice,
//             sort,
//             page = 1,
//             limit = 10

//         } = req.query

//         // Bulid the 'WHERE' clause dynamically

//         const whereClause = {
//             isActive: true // Always only show active items
//         }

//         // Search Logic (Name or Description)

//         if (keyword) {
//             whereClause.OR = [
//                 { name: { contains: keyword, mode: 'insensitive' } },
//                 { description: { contains: keyword, mode: 'insesitive' } }
//             ]
//         }

//         // Filter
//         if (categoryId) whereClause.categoryId = categoryId;
//         if (brandId) whereClause.brandId = brandId;

//         // Price Range Filter
//         if (minPrice || maxPrice) {
//             whereClause.price = {};
//             if (minPrice) whereClause.price.gte = parseFloat(minPrice);// Greater then or Equal
//             if (maxPrice) whereClause.price.lte = parseFloat(maxPrice) // Less than or Equal
//         }

//         // Bulid the Order by Clause

//         let orderBy = { createdAt: 'desc' } // Default : Newest first

//         if (sort === 'price_low') orderBy = { price: 'asc' };
//         if (sort === 'price_high') orderBy = { price: 'desc' };
//         if (sort === 'name_asc') orderBy = { name: 'asc' }

//         // Calculate Pagination

//         const pageNum = parseInt(page);
//         const limitNum = parseInt(limit);
//         const skip = (page - 1) * limitNum;

//         // 5. Execute Queries (Get Data + Count Total)
//         // We run two quires : one for data , one to know total pages

//         const [products, totalCount] = await Promise.all([
//             prisma.product.findMany({
//                 where: whereClause,
//                 orderBy: orderBy,
//                 skip: skip,
//                 take: limitNum,
//                 include: {
//                     images: { take: 1 }, // Just show 1 image on the lisiting card
//                     brand: { select: { name: true } }
//                 }

//             }),
//             prisma.product.count({ where: whereClause })
//         ])

//         // Send Response 

//         res.status(200).json({
//             success: true,
//             count: products.length,
//             totalCount,
//             totalPages: Math.ceil(totalCount / limitNum),
//             currentPage: pageNum,
//             products
//         })
//     } catch (error) {
//         next(error)
//     }
// }


export const getAllProduct = async (req, res, next) => {
    try {
        const {
            keyword,
            categoryId,
            brandId,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 10
        } = req.query;

        // 1. Build the 'WHERE' clause dynamically
        const whereClause = {
            is_active: true,  // Use the name from your schema (is_active vs isActive)
            isDeleted: false  // Don't show soft-deleted items
        };

        // 2. Search Logic (Name or Description)
        if (keyword) {
            whereClause.OR = [
                { name: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } } // Fixed typo 'insesitive'
            ];
        }

        // 3. Filter by IDs (Must Convert String -> Int)
        if (categoryId) whereClause.categoryId = parseInt(categoryId);
        if (brandId) whereClause.brandId = parseInt(brandId);

        // 4. Price Range Filter (CRITICAL CHANGE ⚠️)
        // We must check if ANY variant matches the price range
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

        // 5. Build Sorting
        // Note: Sorting by price is difficult with variants. 
        // Best practice: Sort by Name or Date.
        let orderBy = { createdAt: 'desc' }; // Default: Newest first

        if (sort === 'name_asc') orderBy = { name: 'asc' };
        if (sort === 'name_desc') orderBy = { name: 'desc' };

        // 6. Pagination Math
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 7. Execute Queries
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                orderBy: orderBy,
                skip: skip,
                take: limitNum,
                include: {
                    // Fetch Brand Name
                    brand: { 
                        select: { name: true } 
                    },
                    // Fetch ONE Variant to show the price on the card
                    variants: {
                        take: 1,
                        select: { price_selling: true, price_mrp: true }
                    }
                }
            }),
            prisma.product.count({ where: whereClause })
        ]);

        // 8. Flatten Data for Frontend (Optional but clean)
        // Moves the price from the nested variant up to the main object
        const cleanProducts = products.map(p => ({
            ...p,
            price: p.variants[0]?.price_selling || 0, // Fallback if no variant
            mrp: p.variants[0]?.price_mrp || 0,
            image: p.images[0] // Just send the first image thumbnail
        }));

        res.status(200).json({
            success: true,
            count: cleanProducts.length,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: pageNum,
            products: cleanProducts
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