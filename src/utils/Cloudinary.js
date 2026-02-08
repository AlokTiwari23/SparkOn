import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'



// Configure with your keys from .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


export const uploadOnCloudinary = async( localFilePath) =>{
    try{

        if(!localFilePath) return null ;

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type:"auto"
        })

        // File has been uploaded successfully , remove local file
        // Remove form the local storage means /public/temp
        fs.unlinkSync(localFilePath);
        return response;

    }catch(error){

        // Remove the locally saved temporary file as the upload operation get failed
        fs.unlinkSync(localFilePath)
        return null ;
    }
}


export const deleteFromCloudinary = async(publicId) =>{
    try{
        if(!publicId) return null ;

        // Delete the image using its public ID
        const result = await cloudinary.uploader.destroy(publicId);

        return result
    }catch(error){
        console.log("Error deleting from Cloudianry:", error);
        return null ;
    }
}