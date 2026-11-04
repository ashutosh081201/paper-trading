import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
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
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));

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
