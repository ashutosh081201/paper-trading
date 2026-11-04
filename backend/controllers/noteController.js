const Note = require("../models/Note");
const { sendError } = require("../helpers/httpErrors");
const { requireString, requireSymbol } = require("../helpers/validate");

const MAX_NOTE_LENGTH = 500;

const requireContent = (content) => {
  if (typeof content !== "string" || !content.trim()) {
    return { error: "Note content is required" };
  }
  if (content.trim().length > MAX_NOTE_LENGTH) {
    return { error: `Note cannot exceed ${MAX_NOTE_LENGTH} characters` };
  }
  return { value: content.trim() };
};

const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.userId,
      symbol: requireSymbol(req.params.symbol),
    }).sort({ createdAt: -1 });
    res.status(200).json({ notes });
  } catch (error) {
    sendError(res, error, "Loading notes");
  }
};

const createNote = async (req, res) => {
  try {
    const symbol = requireSymbol(req.params.symbol);
    const content = requireContent(req.body.content);
    if (content.error) return res.status(400).json({ message: content.error });

    const note = await Note.create({
      userId: req.userId,
      symbol,
      companyName: req.body.companyName
        ? requireString(req.body.companyName, "Company name")
        : symbol,
      content: content.value,
    });
    res.status(201).json({ message: "Note added", note });
  } catch (error) {
    sendError(res, error, "Adding the note");
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.status(200).json({ message: "Note deleted" });
  } catch (error) {
    sendError(res, error, "Deleting the note");
  }
};

// Only the content can change; the owner and symbol stay as they were
const updateNote = async (req, res) => {
  try {
    const content = requireContent(req.body.content);
    if (content.error) return res.status(400).json({ message: content.error });

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { content: content.value },
      { returnDocument: "after", runValidators: true },
    );
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.status(200).json({ message: "Note updated", note });
  } catch (error) {
    sendError(res, error, "Updating the note");
  }
};

module.exports = { getNotes, createNote, deleteNote, updateNote };
