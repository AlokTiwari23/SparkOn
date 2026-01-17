import express  from "express";
import cors from "cors";
import { psqlconnect } from "./db/db.psqlconnect.js";

const app = express()

psqlconnect()
app.get("/api",(req,res)=>{
    res.send({message:`Welcome to SparkOn`})
})



export default app ;