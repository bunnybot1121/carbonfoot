import OpenAI from 'openai';

const apiKey = process.env.OPENROUTER_API_KEY || '';
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 PNG

const prompt = `You are a professional receipt parser.
CRITICAL: First, verify if the image is a valid purchase receipt, cash register bill, invoice, or store receipt. 
If the image is NOT a receipt (e.g. it is a person, animal, landscape, generic screenshot, or doesn't list clear items and prices), you MUST return ONLY a JSON object containing an 'error' key explaining the invalidity:
{
  "error": "The uploaded image does not appear to be a valid purchase receipt or bill."
}`;

const models = [
  'google/gemma-4-31b-it:free',
  'openrouter/free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free'
];

async function testAll() {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'EcoTrack',
    }
  });

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const response = await openai.chat.completions.create({
        model: model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      });
      console.log(`Success with ${model}:`);
      console.log(response.choices[0].message.content);
    } catch (err) {
      console.error(`Failed with ${model}:`, err.message);
    }
  }
}

testAll();
