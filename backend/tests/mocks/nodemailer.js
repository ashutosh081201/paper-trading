// Records emails instead of sending them. Tests read `sentMail`.
const sentMail = [];
let failNext = false;

module.exports = {
  sentMail,
  failNextSend: () => {
    failNext = true;
  },
  createTransport: () => ({
    sendMail: async (options) => {
      if (failNext) {
        failNext = false;
        throw new Error("SMTP unavailable");
      }
      sentMail.push(options);
      return { messageId: `test-${sentMail.length}` };
    },
  }),
};
