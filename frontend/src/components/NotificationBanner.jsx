import { useNotification } from "../context/NotificationContext";

const NotificationBanner = () => {
  const { showBanner, bannerMessage, bannerType } = useNotification();

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50
        px-6 py-3 rounded-xl shadow-xl text-white text-sm font-medium
        flex items-center gap-2 transition-all duration-300 ${
          bannerType === "success"
            ? "bg-green-600"
            : bannerType === "error"
              ? "bg-red-600"
              : "bg-blue-600"
        }`}
    >
      <span>
        {bannerType === "success" ? "✅" : bannerType === "error" ? "❌" : "ℹ️"}
      </span>
      <span>{bannerMessage}</span>
    </div>
  );
};

export default NotificationBanner;
