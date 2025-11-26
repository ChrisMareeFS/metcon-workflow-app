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
   - Calculate the average percentage for each metal across all data rows
   - If average "% GOLD" is > 5% and average "% SILVER" is < 1%, the metal type is "gold"
   - If average "% SILVER" is > 5% and average "% GOLD" is < 1%, the metal type is "silver"
   - If both are low or copper is mentioned, the metal type is "copper"
   - Return one of: "copper", "silver", or "gold"

3. **Weight**: CRITICAL - Find the total weight from the SUMMARY row at the bottom of the table:
   - Look for a row that contains "SUMMARY" or "TOTAL" or "Carat" keywords
   - In that summary row, find the column labeled "P. WEIGHT" or "F. WEIGHT" or "WEIGHT"
   - Extract the LARGEST number from that column (typically 10,000-500,000 range)
   - This is usually the rightmost or second-rightmost number in the summary row
   - Remove all commas and return as a number string (e.g., "128885" not "128,885")
   - If you see multiple large numbers, choose the one that's in the weight column position
   - Double-check: the weight should be a large number (at least 10,000)

4. **Supplier**: CRITICAL - Extract the supplier name from the data table:
   - Find the table header row that contains "SUPPLIER" column
   - The SUPPLIER column is typically the third column from the RIGHT
   - Look at all data rows (not the summary row) and extract supplier names from that column
   - If all rows have the same supplier, use that one
   - If there are multiple suppliers, use the most common one
   - The supplier name is typically something like "Geita Gold Refinery Limited (Tanzania)" or similar
   - Extract the FULL supplier name including any location in parentheses
   - Do NOT leave this empty - if you see any supplier names, return the most common one

5. **Carat** (optional): If you see a carat value in the summary row (like "Carat: 23.97"), extract it.

IMPORTANT INSTRUCTIONS:
- For weight: Look specifically in the SUMMARY row, find the "P. WEIGHT" or "F. WEIGHT" column, and extract the number from that exact column position
- For supplier: Look in the SUPPLIER column (third from right) in the DATA rows, not the summary row. Extract the most common supplier name.
- Read numbers very carefully - check each digit
- If weight or supplier is not found, return empty string "" but try your best to find them

Return ONLY a valid JSON object in this exact format:
{
  "batch_number": "9017",
  "pipeline": "gold",
  "initial_weight": "128885",
  "supplier": "Geita Gold Refinery Limited (Tanzania)",
  "carat": "23.97"
}`;

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

