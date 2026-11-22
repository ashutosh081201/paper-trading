import { createContext, useContext, useState } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

const MAX_NOTIFICATIONS = 50;

const storageKey = (user) =>
  user ? `stocklab_notifications_${user._id || user.id}` : null;

const load = (key) => {
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const save = (key, list) => {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // storage full or blocked — notifications just won't persist
  }
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const key = storageKey(user);
  const [notifications, setNotificationsState] = useState(() => load(key));

  // Switch to the signed-in user's saved list when the user changes
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setNotificationsState(load(key));
  }

  const setNotifications = (update) =>
    setNotificationsState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      save(key, next);
      return next;
    });
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerType, setBannerType] = useState("success");

  const notify = (message, type = "success") => {
    // Add to notifications list
    const newNotification = {
      id: Date.now(),
      message,
      type,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) =>
      [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS),
    );

    // Show banner
    setBannerMessage(message);
    setBannerType(type);
    setShowBanner(true);

    // Hide banner after 3 seconds
    setTimeout(() => setShowBanner(false), 3000);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notify,
        markAllRead,
        clearAll,
        unreadCount,
        showBanner,
        bannerMessage,
        bannerType,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook kept beside its provider
export const useNotification = () => useContext(NotificationContext);
