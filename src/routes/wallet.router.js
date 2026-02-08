import express from "express"
import { verfiyToken } from "../middlewares/authentication/isAuthenticated.js"
import { getwalletPassbook, payWithWallet, requestWithdrawal } from "../controllers/wallet.controllers.js"
import { isElectrican } from "../middlewares/authentication/isAuthorizedRoles.js"

const walleteouter = express.Router()

walleteouter.get("/passbook" , verfiyToken , isElectrican,  getwalletPassbook);
walleteouter.post("/pay" , payWithWallet , isElectrican , payWithWallet);
walleteouter.post("/withdraw" , requestWithdrawal , isElectrican , requestWithdrawal);

export default walleteouter