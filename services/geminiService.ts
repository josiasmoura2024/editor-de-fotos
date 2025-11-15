
import { GoogleGenAI, Modality } from "@google/genai";

// The API key is injected from the environment and should not be hardcoded.
// Initialize the Google AI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Edits an image using a text prompt with the Gemini 2.5 Flash Image model.
 * @param base64ImageData The base64-encoded image data, without the data URL prefix.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param prompt The text prompt describing the desired edits.
 * @param referenceImage Optional reference image data.
 * @returns A promise that resolves to the base64-encoded string of the edited image.
 */
export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  referenceImage?: { base64: string, mimeType: string }
): Promise<string> => {
  try {
    const contentParts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
      {
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      },
    ];

    if (referenceImage) {
      contentParts.push({
        inlineData: {
          data: referenceImage.base64,
          mimeType: referenceImage.mimeType,
        },
      });
    }

    contentParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: contentParts,
      },
      // Configuration to ensure the model returns an image.
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Extract the generated image from the response.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data; // Return the base64 string of the edited image.
      }
    }

    // If no image is found in the response, throw an error.
    throw new Error("Nenhuma imagem foi gerada na resposta. O prompt pode ter sido bloqueado ou ser inválido.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    // Provide a more user-friendly error message.
    throw new Error("Falha ao editar a imagem. A solicitação pode ter sido bloqueada devido a políticas de segurança. Tente um prompt ou imagem diferente.");
  }
};

/**
 * Edits a selected area of an image using a text prompt and a selection mask.
 * @param base64ImageData The base64-encoded image data.
 * @param mimeType The MIME type of the image.
 * @param prompt The text prompt for the selected area.
 * @param selection The selection coordinates (x, y, width, height in percentages).
 * @returns A promise that resolves to the base64-encoded string of the edited image.
 */
export const editImageWithSelection = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  selection: { x: number; y: number; width: number; height: number; }
): Promise<string> => {
  try {
    // Create a mask from the selection
    const image = new Image();
    // We need to re-add the data URL prefix for the image to load
    image.src = `data:${mimeType};base64,${base64ImageData}`;
    // Wait for the image to load before we can get its dimensions
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error("Não foi possível obter o contexto do canvas para criar a máscara.");
    }

    // Draw the mask: black background, white selection area
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const maskX = (selection.x / 100) * canvas.width;
    const maskY = (selection.y / 100) * canvas.height;
    const maskWidth = (selection.width / 100) * canvas.width;
    const maskHeight = (selection.height / 100) * canvas.height;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(maskX, maskY, maskWidth, maskHeight);

    // Get the mask as a base64 string
    const maskBase64 = canvas.toDataURL('image/png').split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { inlineData: { data: maskBase64, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("Nenhuma imagem foi gerada na resposta. O prompt pode ter sido bloqueado ou ser inválido.");
  } catch (error) {
    console.error("Error editing image with selection:", error);
    throw new Error("Falha ao editar a área selecionada. A solicitação pode ter sido bloqueada. Tente um prompt ou imagem diferente.");
  }
};
