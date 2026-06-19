import dotenv from 'dotenv';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { PRODUCT_KEYWORD_MAP } from '../config/emission-factors.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory usage tracker to cap requests at 100/day
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

function checkAndIncrementUsage() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }

  if (dailyRequestCount >= 100) {
    console.warn('Daily AI parsing limit of 100 reached. Falling back to OCR.');
    return false;
  }

  dailyRequestCount++;
  console.log(`AI parser usage: ${dailyRequestCount}/100 today`);
  return true;
}

// Fallback OCR + Regex Keyword Matcher
export async function parseWithOCR(imageBuffer) {
  console.log('Running Fallback OCR parser (Tesseract.js)...');
  try {
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        langPath: path.resolve(__dirname, '..'),
        gzip: false
      }
    );
    const text = result.data.text;
    if (!text || text.trim().length === 0) {
      throw new Error('No text detected on the receipt image.');
    }
    console.log('--- OCR EXTRACTED TEXT START ---');
    console.log(text);
    console.log('--- OCR EXTRACTED TEXT END ---');
    console.log('OCR text extracted. Matching keywords...');
    return parseOCRText(text);
  } catch (error) {
    console.error('OCR recognition failed:', error);
    throw new Error(error.message || 'OCR recognition failed to extract readable text.');
  }
}

export function parseOCRText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    throw new Error("The receipt image appears to be blank or unreadable.");
  }
  
  let shopName = "Store / Vendor";
  if (lines.length > 0) {
    shopName = lines[0];
  }
  
  let shopAddress = "";
  const addressRegex = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|court|ct|square|sq|loop|circle|cir|highway|hwy|way|lane|ln|ca|ny|tx|wa|or|fl)\b/i;
  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    if (addressRegex.test(lines[i])) {
      shopAddress = lines[i];
      break;
    }
  }

  const items = [];
  let total = 0.0;
  // Support both dot and comma decimal representations (e.g. 12.50 or 12,50)
  const priceRegex = /(\d+[\.,]\d{2})/;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Add German total keywords: summe, gesamt, betrag
    if (/total|tax|subtotal|balance|payment|change|cash|visa|mastercard|card|summe|gesamt|betrag|endbetrag/i.test(line)) {
      const match = line.match(priceRegex);
      if (match && (/(total|summe|gesamt|betrag)/i.test(line)) && !/subtotal|netto/i.test(line)) {
        const cleanPrice = match[1].replace(',', '.');
        total = parseFloat(cleanPrice);
      }
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
      const cleanPrice = priceMatch[1].replace(',', '.');
      const price = parseFloat(cleanPrice);
      const namePart = line.replace(priceMatch[0], '').replace(/[\$\*\#\-\+\=\:]/g, '').trim();
      
      if (namePart.length > 2) {
        let category = "other";
        const lowercaseName = namePart.toLowerCase();
        
        for (const [cat, keywords] of Object.entries(PRODUCT_KEYWORD_MAP)) {
          const matchedKeyword = keywords.find(keyword => lowercaseName.includes(keyword));
          if (matchedKeyword) {
            category = cat;
            break;
          }
        }

        let quantity = 1.0;
        let unit = "pcs";
        
        // Match quantity at start like "2x" or "1.5 kg"
        const qtyMatch = namePart.match(/^(\d+(?:\.\d+)?)\s*(x|kg|g|lb|oz|l|liter|pcs|pack)\b/i);
        if (qtyMatch) {
          quantity = parseFloat(qtyMatch[1]);
          const parsedUnit = qtyMatch[2].toLowerCase();
          unit = parsedUnit === 'x' ? 'pcs' : parsedUnit;
        }

        items.push({
          name: namePart,
          category,
          quantity,
          unit
        });
      }
    }
  }

  if (items.length === 0) {
    throw new Error("No items with valid price formats could be identified on this receipt.");
  }

  return { shopName, shopAddress, items, total };
}

// Schema validation helper
function validateSchema(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.shopName !== 'string' || !data.shopName) return false;
  if (!Array.isArray(data.items)) return false;
  for (const item of data.items) {
    if (typeof item.name !== 'string' || !item.name) return false;
    if (typeof item.category !== 'string') return false;
    if (typeof item.quantity !== 'number') return false;
    if (typeof item.unit !== 'string') return false;
  }
  return true;
}

export class AIBillParserService {
  async parseBill(imageBuffer, mimeType = 'image/jpeg') {
    let provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    const apiKey = process.env.AI_API_KEY;
    const hasKey = apiKey && apiKey !== 'your_key_here' && apiKey.trim() !== '';

    if (!hasKey) {
      console.warn('AI_API_KEY is missing or template default. Falling back to OCR.');
      return parseWithOCR(imageBuffer);
    }

    if (apiKey.startsWith('sk-or-')) {
      provider = 'openrouter';
    }

    if (!checkAndIncrementUsage()) {
      return parseWithOCR(imageBuffer);
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = `You are a professional receipt parser.
CRITICAL: First, verify if the image is a valid purchase receipt, cash register bill, invoice, or store receipt. 
If the image is NOT a receipt (e.g. it is a person, animal, landscape, generic screenshot, or doesn't list clear items and prices), you MUST return ONLY a JSON object containing an 'error' key explaining the invalidity:
{
  "error": "The uploaded image does not appear to be a valid purchase receipt or bill."
}

If it is a valid receipt, analyze it thoroughly and extract the data into a valid JSON object.
Rules:
1. Read the REAL shop name, shop address, items purchased, and the final total from the receipt.
2. For each item, extract the name, classify the category, determine the quantity, and map the unit.
3. Use ONLY these categories:
   - "meat" (beef, chicken, pork, fish, sausage, steak, cold cuts, etc.)
   - "dairy" (milk, cheese, butter, yogurt, cream, eggs, etc.)
   - "produce" (fruits, vegetables, greens, potatoes, salad, etc.)
   - "packaged_food" (bread, bakery, pasta, rice, snacks, chips, canned items, cookies, and all beverages/drinks like beer, wine, juices, water, soda)
   - "household" (detergent, soap, cleaner, toilet paper, napkins, shampoo, bags, batteries, etc.)
   - "other" (unclassified items)
4. Quantity and Unit:
   - If the item quantity is in grams (g) or ounces (oz), convert it to "kg" (e.g. 500g -> 0.5 kg).
   - If the item volume is in milliliters (ml), convert it to "liter" (e.g. 750ml -> 0.75 liter).
   - Otherwise, use "pcs" for unit counts.
5. Return ONLY a valid JSON object. Do not wrap in markdown or backticks, just return raw JSON text:
{
  "shopName": "extracted shop name",
  "shopAddress": "extracted shop address",
  "items": [
    { "name": "item name", "category": "meat|dairy|produce|packaged_food|household|other", "quantity": 1.5, "unit": "kg|liter|pcs" }
  ],
  "total": 12.50
}`;

    try {
      let responseText = '';

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType
            }
          }
        ]);
        responseText = result.response.text();
      } else if (provider === 'openai') {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });
        responseText = response.choices[0].message.content;
      } else if (provider === 'openrouter') {
        const openai = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "EcoTrack",
          }
        });
        const candidateModels = [
          "meta-llama/llama-3.2-11b-vision-instruct:free",
          "nvidia/nemotron-nano-12b-v2-vl:free"
        ];
        let lastError = null;
        for (const candidateModel of candidateModels) {
          try {
            console.log(`Trying OpenRouter model: ${candidateModel}...`);
            const response = await openai.chat.completions.create({
              model: candidateModel,
              max_tokens: 1024,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${base64Image}`
                      }
                    }
                  ]
                }
              ]
            });
            responseText = response.choices[0].message.content;
            if (responseText) {
              console.log(`Success using OpenRouter model: ${candidateModel}`);
              break;
            }
          } catch (err) {
            console.warn(`Model ${candidateModel} failed:`, err.message);
            lastError = err;
          }
        }
        if (!responseText) {
          throw lastError || new Error("All candidate OpenRouter models failed to respond.");
        }
      } else if (provider === 'anthropic') {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64Image
                  }
                },
                { type: "text", text: prompt }
              ]
            }
          ]
        });
        responseText = response.content[0].text;
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Clean markdown response codeblocks if returned
      let cleanedJsonText = responseText.trim();
      if (cleanedJsonText.startsWith('```')) {
        cleanedJsonText = cleanedJsonText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const parsedData = JSON.parse(cleanedJsonText);
      
      if (parsedData.error) {
        throw new Error(`INVALID_RECEIPT: ${parsedData.error}`);
      }
      
      if (validateSchema(parsedData)) {
        console.log('AI Parsing successful.');
        return parsedData;
      } else {
        console.warn('AI Parsing response failed schema validation. Falling back.');
        return parseWithOCR(imageBuffer);
      }

    } catch (err) {
      if (err.message && err.message.startsWith('INVALID_RECEIPT:')) {
        throw new Error(err.message.replace('INVALID_RECEIPT: ', ''));
      }
      console.error('AI Parsing service failed due to error:', err.message);
      return parseWithOCR(imageBuffer);
    }
  }
}

export const AIBillParser = new AIBillParserService();
