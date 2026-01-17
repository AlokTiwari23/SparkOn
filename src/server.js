import app from "./app.js"

const port = process.env.PORT || 8000;
const server = app.listen(port ,()=>{
    console.log(`Listening at http://localhost:${port}/api`)
})

server.on("error",console.error)
