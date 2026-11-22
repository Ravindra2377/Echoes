import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("echoes_user");
      return stored ? JSON.parse(stored) : { name: "Ravindra", email: "ravindra@echoes.local" };
    } catch {
      return { name: "Ravindra", email: "ravindra@echoes.local" };
    }
  });

  const [userToken, setUserToken] = useState(() => {
    return localStorage.getItem("echoes_token") || "mock_active_session";
  });

  const login = (email, password) => {
    const username = email.split("@")[0] || "User";
    const loggedUser = {
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email,
    };
    const token = `token_${Date.now()}`;
    setUser(loggedUser);
    setUserToken(token);
    localStorage.setItem("echoes_user", JSON.stringify(loggedUser));
    localStorage.setItem("echoes_token", token);
  };

  const register = (name, email, password) => {
    const newUser = { name, email };
    const token = `token_${Date.now()}`;
    setUser(newUser);
    setUserToken(token);
    localStorage.setItem("echoes_user", JSON.stringify(newUser));
    localStorage.setItem("echoes_token", token);
  };

  const logout = () => {
    setUser(null);
    setUserToken(null);
    localStorage.removeItem("echoes_user");
    localStorage.removeItem("echoes_token");
  };

  return (
    <AuthContext.Provider value={{ user, userToken, login, register, logout, isLoggedIn: !!userToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
