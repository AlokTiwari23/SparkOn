import express from "express"
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js"
import { createBrand, createCategory, updateGlobalProductPrice, exportInventoryPDF, getAllAdminProduct, createProduct, toggleVariantStatus, deleteBulkRule, getAllBrand, getAllCategories, getAllProduct, getDeals, getWholesaleDeals, getNewArrival, getProductDetails, getSeasonPicks, getTredingNow, toggleProductStatus, updateBulkRules, updateProduct, updateProductMarketingTags, updateProductPrice, updateProductStock, createProductVariant, getDashboardData } from "../controllers/product.controllers.js"
import { isAdmin } from "../middlewares/authentication/isAuthorizedRoles.js"
import { upload } from "../utils/multer.js"
const productrouter = express.Router()



//  ---- Public : Home Screen & Marketing ---

productrouter.get('/home/trending', getTredingNow) // Based on sales/ views
productrouter.get('/home/dashboard', getDashboardData) // Aggregated calls for the mobile homepage
productrouter.get('/home/seasonal', getSeasonPicks)  // Admin -curated seasonal gear
productrouter.get('/home/deals', getDeals)  // High discount items
productrouter.get('/home/wholesale', getWholesaleDeals) // Bulk pricing deals
productrouter.get('/home/new-arrivals', getNewArrival) // Latest items
// Add new variant to an existing product
productrouter.post('/variant/create', verfiyToken, isAdmin, upload.array('images', 5), createProductVariant);



// ---- Public : Discovery & Search ----
productrouter.get('/all', getAllProduct)  // Main Catalog (Filter / Search)
productrouter.get('/categories', getAllCategories) // For the Category "Circle" icon
productrouter.get('/brand', getAllBrand)   // For the Brand slider
productrouter.get("/:id", getProductDetails) // Product Full info + Related Products


// --- ADMIN : Product & Contnet Management --- (Required verfiyToken & isAdmin)
productrouter.get('/admin/all', verfiyToken, isAdmin, getAllAdminProduct)  // Main Catalog (Filter / Search)
productrouter.post('/create', verfiyToken, isAdmin, upload.array('images', 5), createProduct)
productrouter.put("/update/:id", verfiyToken, isAdmin, upload.any(), updateProduct)

// Quick Updates (Very Important for daily prices/stock)
productrouter.patch("/:id/stock", verfiyToken, isAdmin, updateProductStock)
productrouter.patch('/:id/price', verfiyToken, isAdmin, updateProductPrice)
productrouter.patch("/:id/toggle-status", verfiyToken, isAdmin, toggleProductStatus)
productrouter.patch('/variant/:variantId/toggle-status', verfiyToken, isAdmin, toggleVariantStatus);
productrouter.get('/export/all-pdf', verfiyToken, isAdmin, exportInventoryPDF);
productrouter.get('/export/low-stock-pdf', verfiyToken, isAdmin, exportInventoryPDF);

// Maketing Managment 

productrouter.patch('/:id/marketing-tags', verfiyToken, isAdmin, updateProductMarketingTags)
productrouter.patch("/:id/global-price", verfiyToken, isAdmin, updateGlobalProductPrice);

// --- Setup Data Population
productrouter.post('/categories', verfiyToken, isAdmin, upload.single("image"), createCategory)
productrouter.post('/brands', verfiyToken, isAdmin, upload.single("logo"), createBrand)
productrouter.post('/:id/bulk-rules', verfiyToken, isAdmin, updateBulkRules)
productrouter.delete('/buik-rules/:ruleId', verfiyToken, isAdmin, deleteBulkRule)

export default productrouter;