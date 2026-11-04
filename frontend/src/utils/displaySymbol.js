// Index symbols are stored Yahoo-style ("^NSEI"); show them without the "^".
// Only for display — keep the original symbol for API calls, URLs and keys.
export const displaySymbol = (symbol) => symbol?.replace(/^\^/, "") ?? "";
