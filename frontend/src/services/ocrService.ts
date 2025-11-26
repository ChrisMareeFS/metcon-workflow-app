import { default as api } from './api';

export interface OcrResult {
  batch_number: string;
  pipeline: 'copper' | 'silver' | 'gold';
  initial_weight: string;
  supplier: string;
  carat?: string;
  confidence: number;
}

export const ocrService = {
  /**
   * Process an image using Gemini Vision API
   */
  async processImage(imageBase64: string): Promise<OcrResult> {
    const response = await api.post<{ success: boolean; data: OcrResult }>('/ocr/process', {
      image: imageBase64,
    });
    return response.data.data;
  },
};

