import { useState, useEffect } from "react";
import { getNotes, createNote, deleteNote, updateNote } from "../services/api";

const StockNotes = ({ symbol, companyName }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);


  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await getNotes(symbol);
      setNotes(res.data.notes);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, [symbol]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setAdding(true);
    try {
      const res = await createNote(symbol, {
        content: content.trim(),
        companyName,
      });
      setNotes((prev) => [res.data.note, ...prev]);
      setContent("");
      setShowForm(false);
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note? This can't be undone.")) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n._id !== id));
    } catch {
      // silent
    }
  };

  const handleEdit = (note) => {
    setEditingId(note._id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id) => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const res = await updateNote(id, { content: editContent.trim() });
      setNotes((prev) => prev.map((n) => (n._id === id ? res.data.note : n)));
      setEditingId(null);
      setEditContent("");
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="text-gray-900 dark:text-white font-bold text-sm">
            My Notes
          </h3>
          {notes.length > 0 && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm((prev) => !prev);
            setContent("");
          }}
          className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition font-medium"
        >
          {showForm ? "Cancel" : "+ Add Note"}
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
          <textarea
            placeholder={`Add a note about ${symbol}... (e.g. "Watching for Q2 results", "Bought on dip")`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-gray-400 text-xs">{content.length}/500</p>
            <button
              onClick={handleAdd}
              disabled={adding || !content.trim()}
              className="text-xs bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition font-medium"
            >
              {adding ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">No notes yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Add notes to track your thoughts on {symbol}
          </p>
        </div>
      ) : (
        <div>
          {notes.map((note) => (
            <div
              key={note._id}
              className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 mb-2 last:mb-0"
            >
              {editingId === note._id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 transition resize-none mb-2"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-300 transition px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(note._id)}
                      disabled={saving || !editContent.trim()}
                      className="text-xs bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-gray-400 text-xs">
                      {formatDate(note.createdAt)}
                      {note.updatedAt !== note.createdAt && " (edited)"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-xs text-gray-400 hover:text-blue-400 transition"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="text-xs text-gray-400 hover:text-red-400 transition"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockNotes;
