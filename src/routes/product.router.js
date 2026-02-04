import express from "express"
import { verfiyAdmin, verfiyToken } from "../middlewares/authentication/isAuthenticated"
import { createBanner } from "../controllers/product.controllers"
const productrouter = express.Router()



//  ---- Public : Home Screen & Marketing ---
productrouter.get('/home/banners')  // Top Slider
productrouter.get('/home/trending') // Based on sales/ views
productrouter.get('/home/seasonal')  // Admin -curated seasonal gear
productrouter.get('/home/deals')  // High discount items
productrouter.get('/home/new-arrivals') // Latest items



// ---- Public : Discovery & Search ----
productrouter.get('/')  // Main Catalog (Filter / Search)
productrouter.get('/categories') // For the Category "Circle" icon
productrouter.get('/brand')   // For the Brand slider
productrouter.get("/:id" ) // Product Full info + Related Products


// --- ADMIN : Product & Contnet Management --- (Required verfiyToken & isAdmin)

productrouter.post('/create' , verfiyToken , verfiyAdmin ) 
productrouter.put("/:id")

// Quick Updates (Very Important for daily prices/stock)
productrouter.patch("/:id/stock" , verfiyToken , verfiyAdmin)
productrouter.patch('/:id/price' , verfiyToken , verfiyAdmin)
productrouter.patch("/:id/toggle-status" , verfiyToken , verfiyAdmin)


// Maketing Managment 
productrouter.post('/banner', verfiyToken , verfiyAdmin, createBanner)
productrouter.delete('/banners/:id' , verfiyToken , verfiyAdmin)
productrouter.patch('/:id/marketing-tags' , verfiyToken , verfiyAdmin)


// --- Setup Data Population
productrouter.post('/categories' , verfiyToken , verfiyAdmin)
productrouter.post('/brands' , verfiyToken , verfiyAdmin)
productrouter.post('/:id/bulk-rules' , verfiyToken , verfiyAdmin)
productrouter.delete('/buik-rules/:ruleId' , verfiyToken , verfiyAdmin)

export default productrouter;