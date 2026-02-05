
import prisma from "../db/db.prisam.js"
import { ValidationError } from "../middlewares/errorHandler/index.js";


export const addToCart = async (req,res , next) =>{
    try{
        const userId = req.user.id ; // Form VerifyToken
        
        const { productId , quantity } =req.body ;

        // Validate Input (Default to 1 if not provided  , but allow bulk e.g 50)

        const qtyToAdd = parseInt(quantity) || 1 ;

        if(qtyToAdd <= 0){
            return next(new ValidationError("Quantity must be at least 1"))
        }
        
        // 2 Featch Product & Stock Status 

        const product =await prisma.product.findUnique({
            where : {id: productId}
        })

        if(!product) return next(new ValidationError("Product not found")) ; 
        if(!product.isActive) return next(new ValidationError("Product is currently unavailable"))
        
        // Get or Create User's Cart

        let cart = await prisma.cart.findUnique({
            where : {userId}
        });

        if( !cart ){
            cart = await prisma.cart.findUnique({where : {userId}})         
        }

        // 4. Check if Item is already in Cart

        const existingItem = await prisma.cartItem.findFirst({
            where :{
                cartId : cart.id ,
                productId : productId
            }
        });

        // 5. Calcuation : Final Quantity needed

        let finalQty = qtyToAdd;
        if(existingItem){
            finalQty += existingItem.quantity // Add to existing count
        }

        //  Stock Check 
        if(finalQty > product.stock) {
            return next(new ValidationError(
                `Insufficient Stock  ! You asked for ${finalQty} , but we only have ${product.stock} left.`
            ))
        }

        // 6. Update or Create CartItem
        if(existingItem){
            await prisma.cartItem.update({
                where :{id:existingItem.id},
                data : {quantity : finalQty}
            })
        }else {
            // Create New
            await prisma.cartItem.create({
                data:{
                    cartId : cart.id ,
                    productId : productId ,
                    quantity : finalQty
                }
            })
        }

        res.status(200).json({
            success:true ,
            message:"Item added to cart"
        })

    }catch(error){
        next(error)
    }
}

export const getCart = async(req,res,next) =>{
    try{
        const userId = req.user.id;

        const cart = await prisma.cart.findUnique({
            where :{userId} ,
            include:{
                itmes:{
                    include:{
                        product:{
                            select:{
                                id: true ,
                                name :true ,
                                price :true ,
                                mrp :true ,
                                stock :true , // Fontene needs this limit max input
                                images : {take:1} // Show image in cart
                            }
                        }
                    },
                    orderBy:{
                        product :{
                            createdAt : 'desc'
                        }
                    } // Newest items first
                }
            }
        });

        
        if(!cart || cart.items.length  === 0){
            return res.status(200).json({
                success:true ,
                items : [],
                bill : {
                    total : 0
                }
            })
        }

        let totalMrp = 0 ;
        let totalPrice  = 0 ;

        const formattedItems = cart.items.map(item => {
            const itemTotal = item.product.price * item.quantity
            totalPrice += itemTotal;
            totalMrp += item.product.mrp * item.quantity;

            return {
                id:item.id , // CartItem ID (needed for removal)
                productId : item.product.id ,
                name : item.product.name ,
                image : item.product.images[0]?.url ,
                price : item.price.price,
                mrp : item.product.mrp ,
                quantity : item.quantity ,
                maxStock : item.product.stock , 
                subtotal : itemTotal
            }
        });

        const totalDiscount = totalMrp - totalPrice ; 

        res.status(200).json({
            success:true ,
            items:formattedItems ,
            bill :{
                totalMrp ,
                totalDiscount ,
                finalToPay : totalPrice
            }
        })
    }catch(error){
        next(error)
    }
}


// Users types "10" in the box and hits enter -> We set quantity = 10

export const updatedCartItemQuantity = async(req,res,next) =>{

    try{
        const userId = req.user.id ;

        const  {cartItemId , quantity } = req.body;

        const newQty = parseInt(quantity);

        if(newQty <= 0)return next(new ValidationError("Quantity must be positive"))

        // 1. Find the Items

        const item = await prisma.cartItem.findUnique({
            where :{id:cartItemId},
            include : {product :true}
        })

        if(!item) return next(new ValidationError(`Item not found in the Cart`))

        // 2. Stock Check (Again) !!

        if(newQty > item.product.stock){
            return next(new ValidationError(`Sorry, only ${item.product.stock} units available`))
        }

        // 3.Update

        await prisma.cartItem.update({
            where :{id: cartItemId},
            data :{quantity:newQty}
        });

        res.status(200).json({
            success :true ,
            message: 'Quantity updated'
        })

    }catch(error){
        next(error)
    }

}


export const removeFromCart = async(req,res,next) =>{
    try{

        const userId = req.user.id  ;

        // Find the user's cart 
        const cart = await prisma.cart.findUnique({where : {userId}})

        if(cart) {
            await prisma.cartItem.deleteMany({
                where : {cartId:cart.id}
            });
        }

        res.status(200).json({
            success:true ,
            message: "Cart Cleared"
        })

    }catch(error){
        next(error)
    }
}