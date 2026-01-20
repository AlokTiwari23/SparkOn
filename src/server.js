import app from "./app.js"
import prisma from "./db/db.prisam.js";

const port = process.env.PORT || 8000;

const startServer = async()=>{
    try{
         
        //   Attempt to connect to the Database 
        console.log("Connection to Database")
        await prisma.$connect();
        console.log("Database Connected Successfully !!")

        // Only if db connects , start the server

        const PORT  = process.env.PORT || 8000;

        app.listen(PORT,()=>{
            console.log(`Server running on the http://localhost:${PORT}`)

        })

    }catch(error){
        console.error(`Failed to connect to Database . Server shutting down.`)
        console.error(error)
        process.exit(1)
    }
}

startServer();
