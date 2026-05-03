import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImageToCloudinary(
  base64Data: string,
  mimeType: string,
  folder: string
): Promise<string | null> {
  try {
    const uploadStr = base64Data.startsWith("data:") 
      ? base64Data 
      : `data:${mimeType};base64,${base64Data}`;
    
    const result = await cloudinary.uploader.upload(uploadStr, {
      folder: folder,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
}

export async function deleteImageFromCloudinary(url: string): Promise<void> {
  if (!url.includes("cloudinary.com")) return;

  try {
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456789/folder/filename.ext
    const urlParts = url.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");
    
    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
      // The path after 'v[timestamp]/' is the public ID + extension
      const pathParts = urlParts.slice(uploadIndex + 2);
      const fullPath = pathParts.join("/");
      // Remove extension
      const publicId = fullPath.substring(0, fullPath.lastIndexOf("."));
      
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
}
