import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface OcrResult {
  batch_number: string;
  pipeline: 'copper' | 'silver' | 'gold';
  initial_weight: string;
  supplier: string;
  carat?: string;
  confidence: number;
}

/**
 * Process image using Gemini Vision API to extract production plan data
 */
export async function processImageWithGemini(imageBase64: string): Promise<OcrResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `You are analyzing a Production Plan Form from a metal processing facility. Extract the following information and return it as a JSON object:

1. **Batch Number**: Find the batch number (usually a 3-4 digit number in a highlighted box near "START TIME" or in the header). Look for numbers like "9017", "2770", etc.

2. **Metal Type**: Determine the primary metal type by analyzing the percentage columns:
   - Look at the "% SILVER" and "% GOLD" columns in the table
   - If "% GOLD" values are high (above 50%) and "% SILVER" is low (near 0%), the metal type is "gold"
   - If "% SILVER" values are high and "% GOLD" is low, the metal type is "silver"
   - If both are low or copper is mentioned, the metal type is "copper"
   - Return one of: "copper", "silver", or "gold"

3. **Weight**: Find the total weight from the SUMMARY row at the bottom of the table. Look in the "P. WEIGHT" column or the largest number in the summary row (typically 10,000-500,000 range). Remove commas and return as a number string.

4. **Supplier**: Extract the supplier name from the SUPPLIER column (usually third column from the right). It's typically something like "Geita Gold Refinery Limited (Tanzania)". If all rows have the same supplier, use that one.

5. **Carat** (optional): If you see a carat value in the summary row (like "Carat: 23.97"), extract it.

Return ONLY a valid JSON object in this exact format:
{
  "batch_number": "9017",
  "pipeline": "gold",
  "initial_weight": "125795",
  "supplier": "Geita Gold Refinery Limited (Tanzania)",
  "carat": "23.97"
}

Be very careful with numbers - make sure you read them correctly. Look for the SUMMARY row at the bottom of the table for totals.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/png',
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response (might have markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON object if it's embedded in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate and normalize the result
    const ocrResult: OcrResult = {
      batch_number: String(parsed.batch_number || '').trim(),
      pipeline: (parsed.pipeline === 'copper' || parsed.pipeline === 'silver' || parsed.pipeline === 'gold') 
        ? parsed.pipeline 
        : 'copper',
      initial_weight: String(parsed.initial_weight || '').replace(/,/g, '').trim(),
      supplier: String(parsed.supplier || '').trim(),
      carat: parsed.carat ? String(parsed.carat).trim() : undefined,
      confidence: 0.95, // Gemini doesn't provide confidence, but we trust it more than OCR
    };

    return ocrResult;
  } catch (error: any) {
    console.error('Gemini OCR Error:', error);
    throw new Error(`Failed to process image with Gemini: ${error.message}`);
  }
}

