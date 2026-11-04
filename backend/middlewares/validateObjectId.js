const mongoose = require("mongoose");

// router.param handler: malformed ids get a 400 instead of a CastError 500
const validateObjectId = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
};

module.exports = validateObjectId;
