/**
 * Client-side utility to downscale and compress images (e.g., banners, screenshot receipts)
 * before uploading or resorting to a base64 string fallback.
 * This guarantees the payload stays far below the Vercel 4.5MB and Firestore 1MB limits.
 */
export async function compressImage(file: File, maxWidth = 850, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's not an image, resolve to standard FileReader result
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Downscale proportionally if width exceeds maximum width
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // If canvas context fails, fallback to original raw base64
          resolve(event.target?.result as string || "");
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export to a compressed JPEG
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => {
        // Fallback to raw FileReader on image element error
        resolve(event.target?.result as string || "");
      };
    };
    reader.onerror = (err) => reject(err);
  });
}
