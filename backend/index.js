require('dotenv').config();
const express = require('express');
const cors = require('cors');
const now = new Date();
const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios');

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
      const dateStr = targetDate.toISOString().split("T")[0];
  
      const past = history.findLast(h => h.date.toISOString().split("T")[0] <= dateStr);
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
        interval: "1d"
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
    console.error("❌ Error in /api/commodities:", error.message);
    res.status(500).json({ error: "Failed to fetch commodities" });
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
        interval: "1d"
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
      console.error("❌ Failed to fetch USD/EUR:", error.message);
      res.status(500).json({ error: 'Failed to fetch USD/EUR data' });
    }
  });

  const series = [
    { id: "GS10", name: "US 10-YR", type: "Bond" },
    { id: "GS2", name: "US 2-YR", type: "Bond" },
    { id: "GS30", name: "US 30-YR", type: "Bond" },
    { id: "FEDFUNDS", name: "Fed Funds Rate", type: "Rates" },
    { id: "T5YIFR", name: "5Y Inflation Expectation", type: "Inflation" }
  ];
  
  

  app.get('/api/bonds', async (req, res) => {
    try {
      const apiKey = process.env.FRED_API_KEY;
      const now = new Date();
  
      const series = [
        { id: "GS10", name: "US 10-YR" },
        { id: "GS2", name: "US 2-YR" },
        { id: "GS30", name: "US 30-YR" },
      ];
  
      const bondPromises = series.map(async ({ id, name, type }) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json&observation_start=2018-01-01`;
        const response = await axios.get(url);
      
        const history = response.data.observations
          .filter(o => o.value !== ".")
          .map(o => ({
            date: new Date(o.date),
            value: parseFloat(o.value)
          }));
      
        const latest = history.at(-1).value;
        const changes = calculateChanges(latest, history, now);
      
        return {
          name,
          value: latest,
          type, // Bond, Rates eller Inflation
          spotPrice: false,
          ...changes
        };
      });      
  
      const results = await Promise.all(bondPromises);
      res.json(results);
  
    } catch (error) {
      console.error("❌ Error in /api/bonds:", error.message);
      res.status(500).json({ error: "Failed to fetch bond data" });
    }
  });
  

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
