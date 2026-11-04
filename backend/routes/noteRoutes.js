const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const validateObjectId = require("../middlewares/validateObjectId");
const {
  getNotes,
  createNote,
  deleteNote,
  updateNote,
} = require("../controllers/noteController");

router.get("/:symbol", verifyToken, getNotes);
router.post("/:symbol", verifyToken, createNote);
router.delete("/:id", verifyToken, deleteNote);
router.patch("/:id", verifyToken, updateNote);

router.param("id", validateObjectId);

module.exports = router;
