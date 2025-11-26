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
   STEP 1: Scan the entire document and locate the table with columns like "NO", "PC NUM", "DRILL", "WEIGHT", "% SILVER", "% GOLD", "SUPPLIER", "DESTINATION"
   STEP 2: Find the very last row of the data table - this is the SUMMARY/TOTAL row. It may have text like "SUMMARY", "TOTAL", or "Carat" in it
   STEP 3: In the SUMMARY row, identify which column contains "P. WEIGHT" or "F. WEIGHT" or just "WEIGHT" in the header
   STEP 4: Look at that specific column position in the SUMMARY row and extract the number there
   STEP 5: The weight is typically a large number (10,000 to 500,000) - it's the TOTAL weight of all items
   STEP 6: Remove all commas from the number (e.g., if you see "128,885" return "128885")
   STEP 7: This number is usually in the rightmost columns of the summary row
   IMPORTANT: Do NOT confuse this with individual row weights - you need the TOTAL from the summary row

4. **Supplier**: CRITICAL - Extract the supplier name from the data table:
   STEP 1: Find the table header row - it should have columns like "NO", "PC NUM", "DRILL", "WEIGHT", "% SILVER", "% GOLD", "SUPPLIER", "DESTINATION"
   STEP 2: Locate the "SUPPLIER" column in the header - count from the RIGHT: the rightmost column is #1, next is #2, SUPPLIER is usually #3 from the right
   STEP 3: Now look at ALL the DATA ROWS (skip the header row and skip the summary row at the bottom)
   STEP 4: For each data row, read the text in the SUPPLIER column position
   STEP 5: Collect all supplier names you find (e.g., "Geita Gold Refinery Limited (Tanzania)", "ABC Metals Corp", etc.)
   STEP 6: If all rows have the same supplier name, use that one
   STEP 7: If there are different suppliers, count which one appears most often and use that
   STEP 8: Extract the COMPLETE supplier name including any text in parentheses like "(Tanzania)" or "(USA)"
   STEP 9: The supplier name is usually a company name, may include words like "Refinery", "Limited", "Corp", "Inc"
   CRITICAL: Do NOT return empty string - if you see ANY supplier names in the table, return the most common one. Even if you're not 100% sure, return the best match you can find.

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

    // Log the raw response for debugging
    console.log('Gemini Raw Response:', text);

    // Extract JSON from the response (might have markdown code blocks)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON object if it's embedded in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    console.log('Extracted JSON:', jsonText);

    const parsed = JSON.parse(jsonText);
    
    console.log('Parsed Result:', parsed);

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

