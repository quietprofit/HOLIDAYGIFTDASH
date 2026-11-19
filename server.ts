import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function extractJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(cleaned);
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'holiday-gift-dashboard' });
  });

  app.get('/api/config/maps', (_req, res) => {
    res.json({
      apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    });
  });

  app.get('/api/access/status', (_req, res) => {
    const expectedCode = (process.env.CUSTOMER_ACCESS_CODE || 'HOLIDAY2026').trim();
    res.json({ required: expectedCode.length > 0 });
  });

  app.post('/api/access/verify', (req, res) => {
    const expectedCode = (process.env.CUSTOMER_ACCESS_CODE || 'HOLIDAY2026').trim();
    if (!expectedCode) {
      return res.json({ unlocked: true });
    }
    const submitted = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!submitted) {
      return res.status(400).json({
        unlocked: false,
        error: 'Please enter the access code from your Shopify Welcome PDF.',
      });
    }
    if (submitted.toUpperCase() !== expectedCode.toUpperCase()) {
      return res.status(401).json({
        unlocked: false,
        error: 'That code did not match. Double-check your Welcome PDF and try again.',
      });
    }
    return res.json({ unlocked: true });
  });

  app.post('/api/workshop/suggest', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      const {
        recipientName = 'Family Member',
        relationship = 'Relative',
        ageGroup = 'Adult',
        interests = '',
        maxBudget = 50,
        vibeNotes = '',
        existingGifts = [],
      } = req.body ?? {};

      const prompt = [
        `Generate 5 thoughtful, practical, and festive holiday gift ideas for ${recipientName}.`,
        `Relationship: ${relationship}. Age group: ${ageGroup}.`,
        `Interests & hobbies: ${interests || 'cozy home, family favorites, seasonal treats'}.`,
        `Maximum budget per gift: $${Number(maxBudget) || 50}.`,
        vibeNotes ? `Additional context: ${vibeNotes}.` : '',
        Array.isArray(existingGifts) && existingGifts.length > 0
          ? `Avoid duplicating these already planned gifts: ${existingGifts.join(', ')}.`
          : '',
        `Focus on gifts a busy mom or grandma can easily find at major retailers (Target, Walmart, Amazon, Macy's, Nordstrom, Barnes & Noble, Etsy, or local boutiques) with realistic current pricing.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are Santa\'s Workshop Gift Concierge helping moms and grandmas find thoughtful, realistic holiday gifts within budget. Return strictly valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Specific gift name and product type.' },
                    estimatedPrice: { type: Type.NUMBER, description: 'Realistic USD price.' },
                    recommendedStore: { type: Type.STRING, description: 'Best store to buy from.' },
                    whyItFits: { type: Type.STRING, description: 'Short 1-2 sentence explanation of why they will love it.' },
                    fulfillmentSuggestion: {
                      type: Type.STRING,
                      description: 'Either "in_store" or "online".',
                    },
                    wrappingTip: { type: Type.STRING, description: 'Quick festive wrapping or presentation tip.' },
                  },
                  required: [
                    'title',
                    'estimatedPrice',
                    'recommendedStore',
                    'whyItFits',
                    'fulfillmentSuggestion',
                    'wrappingTip',
                  ],
                },
              },
            },
            required: ['suggestions'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"suggestions":[]}').trim());
      return res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate gift suggestions.';
      console.error('Error in /api/workshop/suggest:', message);
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/workshop/compare', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
      }

      const {
        itemName = '',
        maxBudget = 100,
        cityOrZip = '',
        preferOnline = false,
      } = req.body ?? {};

      if (!String(itemName).trim()) {
        return res.status(400).json({ error: 'Please enter a gift item name to compare prices.' });
      }

      const prompt = [
        `Compare current holiday prices and store availability for the gift: "${String(itemName).trim()}".`,
        `Target budget: $${Number(maxBudget) || 100}.`,
        cityOrZip ? `Shopper area for local store pickup check: ${String(cityOrZip).trim()}.` : '',
        preferOnline
          ? 'Prioritize fast online shipping and promo details.'
          : 'Include both major brick-and-mortar stores for local pickup (Target, Walmart, Best Buy, Barnes & Noble, Kohl\'s, Macy\'s) and online retailers.',
        `Return ONLY a valid JSON object (no extra commentary) with this exact structure:`,
        `{
  "itemName": "normalized product name",
  "msrp": 59.99,
  "bestDealSummary": "1-2 sentence summary of the lowest price and quickest pickup/shipping option",
  "localPickupAlert": "Helpful alert about local in-store stock or holiday shipping cutoff",
  "retailers": [
    {
      "store": "Target",
      "price": 44.99,
      "availabilityStatus": "in_stock",
      "availabilityLabel": "In Stock for Same-Day Pickup",
      "fulfillmentMode": "in_store",
      "shippingOrPickupNote": "Free 2-hour Drive Up",
      "url": "https://www.target.com/s?searchTerm=..."
    }
  ]
}`,
        `Ensure availabilityStatus is strictly one of: "in_stock", "low_stock", "online_only", "unknown".`,
        `Ensure fulfillmentMode is strictly "in_store" or "online".`,
        `Include 4 to 5 retailers sorted from lowest price to highest price.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'You are an automated holiday price comparison and local store availability assistant. Always return strictly valid JSON matching the requested schema.',
        },
      });

      const rawText = response.text ?? '{}';
      const parsed = extractJsonObject(rawText);

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = groundingChunks
        .map((chunk: { web?: { uri?: string; title?: string } }) => chunk.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 6);

      return res.json({
        ...parsed,
        sources,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to compare gift prices.';
      console.error('Error in /api/workshop/compare:', message);
      return res.status(500).json({ error: message });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Holiday Gift Dashboard server listening on http://0.0.0.0:${port}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
