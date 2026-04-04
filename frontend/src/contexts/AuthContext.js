import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("hostelhub_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("hostelhub_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem("hostelhub_token", tokenValue);
    localStorage.setItem("hostelhub_user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("hostelhub_token");
    localStorage.removeItem("hostelhub_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
