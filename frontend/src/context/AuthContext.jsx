import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await getMe();
        setUser(res.data.user);
        connectSocket(token); // ← Connect socket if already logged in
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const updateFunds = (newFunds) => {
    setUser((prev) => ({ ...prev, funds: newFunds }));
  };

  const loginUser = (userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
    connectSocket(token); // ← Connect socket on login
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    setUser(null);
    disconnectSocket(); // ← Disconnect socket on logout
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, loginUser, logoutUser, updateFunds }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook kept beside its provider
export const useAuth = () => useContext(AuthContext);
