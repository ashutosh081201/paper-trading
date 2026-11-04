// Stand-in for the Gemini SDK. Tests set the next reply with `setNextReply`.
let nextReply = null;
const calls = [];

class GoogleGenerativeAI {
  getGenerativeModel({ model }) {
    return {
      generateContent: async (prompt) => {
        calls.push({ model, prompt });
        if (nextReply instanceof Error) throw nextReply;
        return { response: { text: () => nextReply } };
      },
    };
  }
}

module.exports = {
  GoogleGenerativeAI,
  calls,
  setNextReply: (reply) => {
    nextReply = reply;
  },
};
