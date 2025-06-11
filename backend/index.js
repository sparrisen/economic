require('dotenv').config();
const express = require('express');
const cors = require('cors');
const now = new Date();
const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const intervals = {
  change1D: 1,
  change3D: 3,
  change1W: 7,
  change1M: 30,
  change1Y: 365,
  change5Y: 1825,
  changeYTD: Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)),
};

const calculateChanges = (latest, history, now) => {
  const changes = {};
  for (const [label, value] of Object.entries(intervals)) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - value);
    const dateStr = targetDate.toISOString().split('T')[0];
    const past = history.findLast(h => h.date.toISOString().split('T')[0] <= dateStr);
    const pastValue = past?.close ?? past?.value;
    if (pastValue) {
      const delta = latest - pastValue;
      const percent = (delta / pastValue) * 100;
      changes[label] = parseFloat(delta.toFixed(2));
      changes[`${label}Percent`] = parseFloat(percent.toFixed(2));
    } else {
      changes[label] = null;
      changes[`${label}Percent`] = null;
    }
  }
  return changes;
};

app.get('/api/commodities', async (req, res) => {
  try {
    const symbols = [
      { symbol: 'GC=F', name: 'Gold', type: 'Metals' },
      { symbol: 'SI=F', name: 'Silver', type: 'Metals' },
      { symbol: 'HG=F', name: 'Copper', type: 'Metals' },
      { symbol: 'PL=F', name: 'Platinum', type: 'Metals' },
      { symbol: 'CL=F', name: 'Crude Oil', type: 'Energy' },
      { symbol: 'NG=F', name: 'Natural Gas', type: 'Energy' }
    ];
    const now = new Date();
    const results = await Promise.all(symbols.map(async ({ symbol, name, type }) => {
      const quote = await yahooFinance.quote(symbol);
      const history = await yahooFinance.historical(symbol, {
        period1: new Date(now.getFullYear() - 6, now.getMonth(), now.getDate()),
        period2: now,
        interval: '1d'
      });
      const changes = calculateChanges(quote.regularMarketPrice, history, now);
      return {
        name,
        value: quote.regularMarketPrice,
        type,
        spotPrice: true,
        ...changes
      };
    }));
    res.json(results);
  } catch (error) {
    console.error('❌ Error in /api/commodities:', error.message);
    res.status(500).json({ error: 'Failed to fetch commodities' });
  }
});

app.get('/api/usd-eur', async (req, res) => {
  try {
    const symbol = 'EURUSD=X';
    const name = 'EUR/USD';
    const type = 'FX';
    const now = new Date();
    const quote = await yahooFinance.quote(symbol);
    const history = await yahooFinance.historical(symbol, {
      period1: new Date(now.getFullYear() - 6, now.getMonth(), now.getDate()),
      period2: now,
      interval: '1d'
    });
    const changes = calculateChanges(quote.regularMarketPrice, history, now);
    res.json({
      name,
      value: quote.regularMarketPrice,
      type,
      spotPrice: false,
      ...changes
    });
  } catch (error) {
    console.error('❌ Failed to fetch USD/EUR:', error.message);
    res.status(500).json({ error: 'Failed to fetch USD/EUR data' });
  }
});

const series = [
  { id: 'GS10', name: 'US 10-YR', type: 'Bond' },
  { id: 'GS2', name: 'US 2-YR', type: 'Bond' },
  { id: 'GS30', name: 'US 30-YR', type: 'Bond' },
  { id: 'FEDFUNDS', name: 'Fed Funds Rate', type: 'Rates' },
  { id: 'T5YIFR', name: '5Y Inflation Expectation', type: 'Inflation' }
];

app.get('/api/bonds', async (req, res) => {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const now = new Date();
    const series = [
      { id: 'GS10', name: 'US 10-YR' },
      { id: 'GS2', name: 'US 2-YR' },
      { id: 'GS30', name: 'US 30-YR' }
    ];
    const bondPromises = series.map(async ({ id, name }) => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json&observation_start=2018-01-01`;
      const response = await axios.get(url);
      const history = response.data.observations
        .filter(o => o.value !== '.')
        .map(o => ({
          date: new Date(o.date),
          value: parseFloat(o.value)
        }));
      const latest = history.at(-1).value;
      const changes = calculateChanges(latest, history, now);
      return {
        name,
        value: latest,
        type: 'Bond',
        spotPrice: false,
        ...changes
      };
    });
    const results = await Promise.all(bondPromises);
    res.json(results);
  } catch (error) {
    console.error('❌ Error in /api/bonds:', error.message);
    res.status(500).json({ error: 'Failed to fetch bond data' });
  }
});

// Profiles data with new fields
const profiles = [
  {
    id: 1,
    name: 'George Gammon',
    shortDescription: 'Makroinvesterare och kommentator med libertariansk syn på ekonomin.',
    longDescription: `George Gammon is an American real estate investor and macroeconomic commentator known for his libertarian, Austrian School-influenced views. 
He often expresses skepticism of central banking and central planning, advocating free-market solutions. 

In mid-2023, Gammon predicted an inevitable universal basic income (UBI) within three years, citing trends like government-funded accounts for children as steps toward a centralized digital currency. 

He interprets rising gold prices and current bond yields as signals of market fears about inflation and excessive government intervention.`
  },
  {
    id: 2,
    name: 'Paul Krugman',
    shortDescription: 'Nobelpristagande ekonom och uttalad anhängare av keynesiansk ekonomi.',
    longDescription: `Paul Krugman is an American economist known for his influential work in international economics and his strong Keynesian perspective. 
He advocates for active government intervention and fiscal stimulus to manage economic downturns, and he often criticizes strict austerity measures. 

Krugman frequently argues that well-timed government spending can mitigate recessions and that concerns about deficits are often overblown in the short term. 

As a New York Times columnist, he regularly analyzes current economic events, inflation, and policy decisions through a Keynesian lens.`
  }
];

// Endpoint to get all profiles
app.get('/api/profiles', (req, res) => {
  res.json(profiles);
});

// Endpoint to get a single profile by id
app.get('/api/profiles/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const profile = profiles.find(p => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

// Endpoint to generate PDF document for a profile
app.get('/api/profiles/:id/generate-document', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const profile = profiles.find(p => p.id === id);
    if (!profile) {
      return res.status(404).send('Profile not found');
    }
    const includeAI = req.query.includeAI === 'true' || req.query.includeAI === '1';
    const format = req.query.format || '1';  // format selected (not altering content in this implementation)

    // Initialize PDF document
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${profile.name.replace(/\s+/g, '_')}_Profile.pdf`);
    const doc = new PDFDocument();
    doc.pipe(res);

    // AI command instructions (if included)
    let aiCommand = '';
    if (includeAI) {
      aiCommand =
`You are now ${profile.name}. Everything in this document represents your knowledge, your voice, and your views on macroeconomics. Carefully read the entire content. When someone uploads this file into an AI system like ChatGPT, your job is to respond exactly as if you are ${profile.name}.

Your first response should be:
"Hi, I'm ${profile.name}, your macroeconomic guide. How can I help you today?"

For answering questions going forward, structure your responses based on the user’s selected preference:
- Format 1: Long-form narrative response.
- Format 2: Bullet points for clarity.
- Format 3: Expert-style decision tree (you choose best format).

End of instruction.`;
      doc.fontSize(12).text(aiCommand);
      doc.moveDown();
    }

    // Profile content in the document
    doc.fontSize(12).text(profile.longDescription);
    if (includeAI) {
      doc.moveDown();
      doc.fontSize(12).text(aiCommand);
    }
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate document');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
