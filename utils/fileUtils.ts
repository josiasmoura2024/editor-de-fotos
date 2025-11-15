
/**
 * Converts a File object to a base64 encoded string and extracts its MIME type.
 * @param file The File object to convert.
 * @returns A promise that resolves with an object containing the base64 string (without the data URL prefix) and the MIME type.
 */
export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(',');

      if (!header || !base64) {
        reject(new Error('Invalid file format. Could not split data URL.'));
        return;
      }
      
      // Extract mimeType from header, e.g., "data:image/png;base64"
      const mimeTypeMatch = header.match(/:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : file.type; // Fallback to file.type

      if (!mimeType) {
        reject(new Error('Could not determine MIME type of the file.'));
        return;
      }

      resolve({ base64, mimeType });
    };

    reader.onerror = (error) => {
      reject(error);
    };
  });
};
