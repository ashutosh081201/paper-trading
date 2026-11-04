// Maps errors to HTTP responses so controllers don't have to:
// bad input → 400, a failing upstream service → 502, anything else → 500
// (logged, with no internal details sent to the client).

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Marks an error from market data, NewsAPI, Gemini or email as upstream
const upstream = (error, message) => {
  const err = new HttpError(502, message || error.message);
  err.cause = error;
  return err;
};

const describeValidation = (error) =>
  Object.values(error.errors || {})[0]?.message || "Invalid input";

const sendError = (res, error, action) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${error.path}` });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: describeValidation(error) });
  }
  console.error(`${action} failed:`, error);
  return res
    .status(500)
    .json({ message: `${action} failed. Please try again.` });
};

module.exports = { HttpError, upstream, sendError };
