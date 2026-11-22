import { displaySymbol } from "../utils/displaySymbol";

const WatchlistPickerModal = ({
  watchlists,
  symbol,
  companyName,
  symbolsByWatchlist = {},
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Add to Watchlist
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              {companyName
                ? `${companyName} (${displaySymbol(symbol)})`
                : displaySymbol(symbol)}{" "}
              — Choose a watchlist
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-xl"
          >
            ✕
          </button>
        </div>

        {/* Watchlist Options */}
        <div className="p-3">
          {watchlists.map((wl) => {
            const wlSymbols = symbolsByWatchlist[wl._id];
            const alreadyIn =
              wlSymbols instanceof Set ? wlSymbols.has(symbol) : false;
            const isFull = wl.count >= 20 && !alreadyIn;

            return (
              <button
                key={wl._id}
                onClick={() => {
                  if (!alreadyIn && !isFull) {
                    onSelect(wl._id, wl.name);
                  }
                }}
                disabled={alreadyIn || isFull}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition mb-1 last:mb-0 ${
                  alreadyIn
                    ? "bg-green-50 dark:bg-green-900/10 cursor-default"
                    : isFull
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{alreadyIn ? "✅" : "⭐"}</span>
                  <div className="text-left">
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">
                      {wl.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {wl.count}/20 stocks
                      {isFull ? " — Full" : ""}
                    </p>
                  </div>
                </div>
                {alreadyIn ? (
                  <span className="text-green-500 text-xs font-semibold">
                    ✓ Added
                  </span>
                ) : isFull ? (
                  <span className="text-gray-400 text-xs">Full</span>
                ) : (
                  <span className="text-green-400 text-sm font-bold">
                    + Add
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-gray-400 text-xs text-center pb-4">
          Same stock can be added to multiple watchlists
        </p>
      </div>
    </div>
  );
};

export default WatchlistPickerModal;
