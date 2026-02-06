import express from "express"
import { verfiyToken } from "../middlewares/authentication/isAuthenticated"
import { getwalletPassbook, payWithWallet, requestWithdrawal } from "../controllers/wallet.controllers"
import { isElectrican } from "../middlewares/authentication/isAuthorizedRoles"

const walleteouter = express.Router()

walleteouter.get("/passbook" , verfiyToken , isElectrican,  getwalletPassbook);
walleteouter.post("/pay" , payWithWallet , isElectrican , payWithWallet);
walleteouter.post("/withdraw" , requestWithdrawal , isElectrican , requestWithdrawal);