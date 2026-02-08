import multer from "multer";

// Configure storage : Save files locally first
const storage = multer.diskStorage({
    destination : function (req,file ,cb){
    //     File will be saved in the 'public/temp' folder
    //     Make sure this folder exists in your project root !! 
        cb(null , "./public/temp")

    },
    filename:function(req, file, cb) {
        // Keep the original file name + a timestamp to avoid duplicates
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
        //  You can just use file.originalname , but adding uniqueSuffix is safer
        cb(null , file.originalname)
    }
});


// Export the upload middleware
export const upload = multer({
    storage : storage ,
    limits:{
        fileSize :  5*1024*1024  // Limit file size to 5mb (Optional but good practice)
    }
})