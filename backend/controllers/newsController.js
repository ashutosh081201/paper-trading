const axios = require("axios");
const { getQuotes } = require("../helpers/stockHelper");
const { sendError, upstream } = require("../helpers/httpErrors");

const getMarketNews = async (req, res) => {
  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: 'NSE OR BSE OR "Indian stock market" OR "Sensex" OR "Nifty" OR "RBI" OR "SEBI"',
        language: "en",
        sortBy: "publishedAt",
        pageSize: 20,
        apiKey: process.env.NEWS_API_KEY,
      },
    });

    const articles = response.data.articles
      .filter((a) => a.title && a.url && a.title !== "[Removed]")
      .map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source.name,
        publishedAt: a.publishedAt,
        urlToImage: a.urlToImage,
      }));

    res.status(200).json({ articles });
  } catch (error) {
    console.error("Market news error:", error.message);
    sendError(res, upstream(error, `Couldn't load news: ${error.message}`), "Loading news");
  }
};

const getMarketIndices = async (req, res) => {
  try {
    const indices = [
      { symbol: "^NSEI", name: "NIFTY 50" },
      { symbol: "^BSESN", name: "SENSEX" },
      { symbol: "^NSEBANK", name: "BANK NIFTY" },
      { symbol: "^CNXIT", name: "NIFTY IT" },
      { symbol: "^NSMIDCP", name: "NIFTY MIDCAP 100" },
      { symbol: "^CNXSMCAP", name: "NIFTY SMALLCAP" },
      { symbol: "^CNXAUTO", name: "NIFTY AUTO" },
      { symbol: "^CNXPHARMA", name: "NIFTY PHARMA" },
      { symbol: "^CNXFMCG", name: "NIFTY FMCG" },
      { symbol: "^CNXMETAL", name: "NIFTY METAL" },
      { symbol: "^CNXREALTY", name: "NIFTY REALTY" },
      { symbol: "^CNXENERGY", name: "NIFTY ENERGY" },
      { symbol: "^CNXFINANCE", name: "NIFTY FINANCE" },
      { symbol: "^CNXPSUBANK", name: "NIFTY PSU BANK" },
      { symbol: "^CNXINFRA", name: "NIFTY INFRA" },
    ];

    const quotes = await getQuotes(indices.map((index) => index.symbol));

    const results = indices.map((index) => {
      const quote = quotes[index.symbol];
      if (!quote) return null; // skip failed indices
      return {
        symbol: index.symbol,
        name: index.name,
        price: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        isPositive: quote.change >= 0,
      };
    });

    // Filter out any that failed
    const validResults = results.filter((r) => r !== null);

    res.status(200).json({ indices: validResults });
  } catch (error) {
    console.error("Indices error:", error.message);
    sendError(res, upstream(error, "Couldn't load index prices"), "Loading indices");
  }
};

module.exports = { getMarketNews, getMarketIndices };
