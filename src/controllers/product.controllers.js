import { success } from "zod";
import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js";
import { deleteFromClodinary, uploadOnCloudinary } from "../utils/Cloudinary.js";



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

        const { name, description } = res.body;

        // Image comes from multer -> Cloudinary

        const localFilePath = req.file?.path;

        if (!name) return next(new ValidationError("Category name is required"))

        let imageUrl = "";

        if (localFilePath) {
            const response = await uploadOnCloudinary(localFilePath);
            if (response) {
                imageUrl = response
            }
        }

        const category = await prisma.category.create({
            data: { name, description, image: imageUrl }
        })

        res.status(201).json({
            success: true,
            category
        })
    } catch (error) {
        next(error)
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
    try {

        const { name } = req.body
        const localFilePath = req.file?.path //Brand Logo

        if (!name) return next(new
            ValidationError("Brand name is required")
        )

        let logoUrl = "";
        if (localFilePath) {
            const response = await uploadOnCloudinary(localFilePath)
            if (response) {
                logoUrl = response.secure_url
            }
        }

        const brand = await prisma.brand.create({
            data: { name, logo: logoUrl }
        })

        res.status(201).json({
            success: true,
            brand
        })



    } catch (error) {
        next(error)
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

        //1. Extract Text Data 
        const {
            name, description, price, mrp, stock, categoryId, brandId, isFeatured
        } = req.body;

        // 2. Validate Basic Fields 

        if (!name || !description || !price || !categoryId) {
            return next(new ValidationError("Please provide all required fields"))
        }

        // 3. Hnadle Image Uploaded (Array)
        // req.files is provided by Multer

        const imageFiles = req.files;
        const uploadedImages = [];

        if (imageFiles && imageFiles.length > 0) {
            for (const file of imageFiles) {
                const response = await uploadOnCloudinary(file.path);
                if (response) {
                    uploadedImages.push({
                        url: response.secure_url,
                        publicId: response.public_id
                    })
                }
            }
        }

        // 4. Create Product in DB
        //  Note : We use 'create' with a nested 'create' for iamges

        const product = await prisma.product.create({
            data: {
                name,
                description,
                //  Convert String to Number (Form-Data sends strings)

                price: parseFloat(price),
                mrp: parseFloat(mrp) || parseFloat(price),
                stock: parseInt(stock) || 0,
                isFeatured: isFeatured === 'true', // Convert "true" string to boolean

                categoryId,
                brandId,
                // 


                // Create related Image rows automatically 
                images: {
                    create:
                        uploadedImages.map(img => ({
                            url: img.url

                            // If you added publicd to schems . add it  here too
                        }))


                }

            },
            include: { image: true } // Return the full Object
        });

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        })

    } catch (error) {
        next(error)
    }
}


// Update Product (Full Edit)

export const updateProduct = async (req, res, next) => {
    try {

        const { id } = req.params;

        const { name, description, price, mrp, categoryId, brandId, isFeatured } = req.body

        const product = await prisma.product.update({
            where: { id },
            data: {
                name,
                description,
                price: price ? parseFloat(price) : undefined,
                mrp: mrp ? parseFloat(mrp) : undefined,
                categoryId,
                brandId,
                isFeatured: isFeatured ? (isFeatured === "true") : undefined
            }
        });

        res.status(200).json({
            success: true,
            product
        })

    } catch (error) {
        next(error)
    }
}

// 3. Quick  Stock Update (Fast!)
// Use this whne new inventory arrives

export const updateProductStock = async (req, res, next) => {
    try {

        const { id } = req.params;

        const { stock } = req.body;
        // Problems 1.
        const product = await prisma.product.update({
            where: { id },
            data: { stock: parseInt(stock) }
        })

    } catch (error) {
        next(error)
    }
}


export const updateProductPrice = async (req, res, next) => {
    try {

        const { id } = req.params;
        const { price, mrp } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: {
                price: parseFloat(price),
                mrp: mrp ? parseFloat(mrp) : undefined
            }
        });

        res.status(200).json({
            success: true,
            message: "Price Updated",
            price: product.price
        })

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
            data: { isActive: false }
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
            keyword,
            categoryId,
            brandId,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 10

        } = req.query

        // Bulid the 'WHERE' clause dynamically

        const whereClause = {
            isActive: true // Always only show active items
        }

        // Search Logic (Name or Description)

        if (keyword) {
            whereClause.OR = [
                { name: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insesitive' } }
            ]
        }

        // Filter
        if (categoryId) whereClause.categoryId = categoryId;
        if (brandId) whereClause.brandId = brandId;

        // Price Range Filter
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price.gte = parseFloat(minPrice);// Greater then or Equal
            if (maxPrice) whereClause.price.lte = parseFloat(maxPrice) // Less than or Equal
        }

        // Bulid the Order by Clause

        let orderBy = { createdAt: 'desc' } // Default : Newest first

        if (sort === 'price_low') orderBy = { price: 'asc' };
        if (sort === 'price_high') orderBy = { price: 'desc' };
        if (sort === 'name_asc') orderBy = { name: 'asc' }

        // Calculate Pagination

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (page - 1) * limitNum;

        // 5. Execute Queries (Get Data + Count Total)
        // We run two quires : one for data , one to know total pages

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                orderBy: orderBy,
                skip: skip,
                take: limitNum,
                include: {
                    images: { take: 1 }, // Just show 1 image on the lisiting card
                    brand: { select: { name: true } }
                }

            }),
            prisma.product.count({ where: whereClause })
        ])

        // Send Response 

        res.status(200).json({
            success: true,
            count: products.length,
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: pageNum,
            products
        })
    } catch (error) {
        next(error)
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
            take:5 // Limit to top 5 suggestions
        });

        res.status(200).json({
            success:true,
            suggestions:products
        })

    } catch (error) {
        next(error)
    }
}


export const getProductDetails = async(req,res,next) =>{
    try{
        const { id} = req.params;

        // Fetch Prduct with All details

        const product = await prisma.product.findUnique({
            where :{id},
            include:{
                brand :true ,
                category:true,
                image:true ,
                // If you add Reviews table:
                //  reviews :{take: 3 , orderBy :{
                // createdAt : 'desc'}}
            }
        });

        if(!product){
            return next(new ValidationError("Product not Found"))
        }

        //2 .Fetch Related Products (Smae , Excluding current one)
        const relatedProducts = await prisma.product.findMany({
            where :{
                categoryId:product.categoryId,
                id:{not : product.id} , // Exclude current
                isActive :true
            },
            take:4 ,
            include:{image:{take:1}}
        })


        // 3. Calculate Discount Math (Backend Logic)

        let discountPercentage = 0 ;
        let SaveAmount = 0;

        if(product.mrp > product.price){
            saveAmount = product.mrp - product.price;
            discountPercentage =Math.round((saveAmount / product.mrp))
        }

        // 4. Construct Offers (Hardcoded for now . or fetch from db)
        const offers = [];
        if(discountPercentage > 10){
            offers.push({title : "Greate Price" , description :`You save ₹${saveAmount} on this tiem !`}) ; }

        offers.push({title:"Band Offer" , description : "5% Unlimited Cashback on Axis Bank Cards"})

        // 5. Send Final Response 
        res.status(200).json({
            success:true ,
            product:{
                ...product,
                discountPercentage,
                saveAmount,
                availableOffers : offers
            } ,
            relatedProducts
        })

    }catch(error){
        next(error)
    }
}