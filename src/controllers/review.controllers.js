import prisma from "../db/db.prisam.js"


export const addReview   = async(req,res,next) =>{
    try{

        const customerId = req.user.id ;
        const {productId , rating , comment} = req.body ;

        const reviews = await prisma.review.create({
            data:{
                customer_id : customerId,
                product_id : parseInt(productId),
                rating : parseInt(rating),
                comment : comment,
                is_active : true
            }
        })

        res.status(201).json({
            success : true,
            reviews
        })

    }catch(error){
        next(error)
    }
}

export const getProductReviews = async(req,res,next) =>{
    try{

        const { productId} =req.params ; 
        const reviews = await prisma.review.findMany({
            where : {product_id : parseInt(productId) , is_active:true},
            include : {customer : {select:{name :true}}},
            orderBy : {created_at : 'desc'}
        });
        res.status(200).json({
            success:true,
            reviews
        })

    }catch(error){
        next(error)
    }
}