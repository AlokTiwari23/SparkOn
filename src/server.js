import app from "./app.js"

const port = process.env.PORT || 8000;
const server = app.listen(port ,()=>{
    console.log(`Listening at http://localhost:${port}/api`)
    console.log(`Swagger Docs available at http://localhost:${port}/api-docs`)
})

server.on("error",console.error)
