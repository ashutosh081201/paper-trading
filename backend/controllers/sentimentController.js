const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendError, upstream } = require("../helpers/httpErrors");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getStockSentiment = async (req, res) => {
  try {
    const { symbol } = req.params;
    const companyName = req.query.company || symbol;

   const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `
You are a financial analyst specializing in Indian stock markets (NSE/BSE).
Analyze the stock: ${companyName} (${symbol}) listed on NSE India.

Provide a JSON response with exactly this structure:
{
  "sentiment": "Bullish" or "Bearish" or "Neutral",
  "score": number between 0 and 100 (0=very bearish, 50=neutral, 100=very bullish),
  "riskLevel": "Low" or "Medium" or "High",
  "summary": "2-3 sentence overall assessment of this stock",
  "reasons": [
    "reason 1 (positive or negative factor)",
    "reason 2 (positive or negative factor)",
    "reason 3 (positive or negative factor)"
  ],
  "recommendation": "Buy" or "Hold" or "Sell"
}

Base your analysis on:
- Company fundamentals and sector position
- Recent industry trends in India
- General market conditions
- Company's historical performance reputation

Return ONLY the JSON object, no other text.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean and parse JSON
    const cleaned = text.replace(/```json|```/g, "").trim();
    const sentiment = JSON.parse(cleaned);

    res.status(200).json({ sentiment });
  } catch (error) {
    console.error("Sentiment error:", error.message);
    sendError(
      res,
      upstream(error, `AI analysis is unavailable right now: ${error.message}`),
      "AI analysis",
    );
  }
};

module.exports = { getStockSentiment };
