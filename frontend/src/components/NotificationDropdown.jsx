import { useNotification } from "../context/NotificationContext";

const NotificationDropdown = ({ onClose }) => {
  const { notifications, markAllRead, clearAll, unreadCount } =
    useNotification();

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-gray-800 dark:bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <p className="text-white font-semibold text-sm">Notifications</p>
          {unreadCount > 0 && (
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            className="text-gray-400 hover:text-white text-xs transition"
          >
            Mark all read
          </button>
          <button
            onClick={() => {
              clearAll();
              onClose();
            }}
            className="text-gray-400 hover:text-white text-xs transition"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-gray-400 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-700 last:border-0 ${
                !notification.read ? "bg-gray-700/50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">
                    {notification.type === "success"
                      ? "✅"
                      : notification.type === "error"
                        ? "❌"
                        : "ℹ️"}
                  </span>
                  <p className="text-gray-200 text-sm">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-green-400 rounded-full shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-gray-500 text-xs mt-1 ml-6">
                {formatTime(notification.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
