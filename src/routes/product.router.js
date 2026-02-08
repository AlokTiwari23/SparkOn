import express from "express"
import {  verfiyToken } from "../middlewares/authentication/isAuthenticated.js"
import { createBanner, createBrand, createCategory, createProduct, deleteBanner, deleteBulkRule, getAllBrand, getAllCategories, getAllProduct, getDeals, getHomeBanner, getNewArrival, getProductDetails, getSeasonPicks, getTredingNow, toggleProductStatus, updateBulkRules, updateProduct, updateProductMarketingTags, updateProductPrice, updateProductStock } from "../controllers/product.controllers.js"
import { isAdmin } from "../middlewares/authentication/isAuthorizedRoles.js"
import { upload } from "../utils/multer.js"
const productrouter = express.Router()



//  ---- Public : Home Screen & Marketing ---
productrouter.get('/home/banners' , getHomeBanner)  // Top Slider
productrouter.get('/home/trending' , getTredingNow) // Based on sales/ views
productrouter.get('/home/seasonal' , getSeasonPicks)  // Admin -curated seasonal gear
productrouter.get('/home/deals' , getDeals)  // High discount items
productrouter.get('/home/new-arrivals' , getNewArrival) // Latest items



// ---- Public : Discovery & Search ----
productrouter.get('/' , getAllProduct)  // Main Catalog (Filter / Search)
productrouter.get('/categories' , getAllCategories) // For the Category "Circle" icon
productrouter.get('/brand' , getAllBrand)   // For the Brand slider
productrouter.get("/:id" , getProductDetails ) // Product Full info + Related Products


// --- ADMIN : Product & Contnet Management --- (Required verfiyToken & isAdmin)

productrouter.post('/create' , verfiyToken , isAdmin , upload.array('image',5) , createProduct  ) 
productrouter.put("/:id" , verfiyToken ,isAdmin , upload.array('images' , 5), updateProduct)

// Quick Updates (Very Important for daily prices/stock)
productrouter.patch("/:id/stock" , verfiyToken , isAdmin , updateProductStock)
productrouter.patch('/:id/price' , verfiyToken , isAdmin , updateProductPrice)
productrouter.patch("/:id/toggle-status" , verfiyToken , isAdmin , toggleProductStatus )


// Maketing Managment 
productrouter.post('/banner', verfiyToken , isAdmin, upload.single('banner'), createBanner)
productrouter.delete('/banners/:id' , verfiyToken , isAdmin , deleteBanner)
productrouter.patch('/:id/marketing-tags' , verfiyToken , isAdmin , updateProductMarketingTags)


// --- Setup Data Population
productrouter.post('/categories' , verfiyToken , isAdmin, upload.single("image") , createCategory)
productrouter.post('/brands' , verfiyToken , isAdmin , upload.single("logo") , createBrand)
productrouter.post('/:id/bulk-rules' , verfiyToken , isAdmin , updateBulkRules)
productrouter.delete('/buik-rules/:ruleId' , verfiyToken , isAdmin , deleteBulkRule)

export default productrouter;