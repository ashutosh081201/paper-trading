const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    // Read from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const verified = jwt.verify(token, process.env.TOKEN_KEY);
    req.userId = verified.id;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired token. Please login again." });
  }
};

module.exports = verifyToken;
