import { createContext, useContext, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "cyber-vidya-auth";

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { token: "", user: null };
    }

    try {
      return JSON.parse(stored);
    } catch {
      return { token: "", user: null };
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
  }, [authState]);

  async function login(email, password) {
    const response = await apiRequest("/api/auth/login/", {
      method: "POST",
      body: { email, password },
    });

    setAuthState({
      token: response.data.token,
      user: response.data.user,
    });

    return response;
  }

  async function logout() {
    if (authState.token) {
      try {
        await apiRequest("/api/auth/logout/", {
          method: "POST",
          token: authState.token,
        });
      } catch {
        // Ignore logout failures when clearing local state.
      }
    }

    setAuthState({ token: "", user: null });
  }

  async function refreshProfile() {
    if (!authState.token) {
      return null;
    }

    const response = await apiRequest("/api/auth/profile/", {
      token: authState.token,
    });
    setAuthState((current) => ({
      ...current,
      user: response.data,
    }));
    return response.data;
  }

  async function changePassword(currentPassword, newPassword) {
    const response = await apiRequest("/api/auth/change-password/", {
      method: "POST",
      token: authState.token,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
    await logout();
    return response;
  }

  const value = {
    token: authState.token,
    user: authState.user,
    setUser(user) {
      setAuthState((current) => ({ ...current, user }));
    },
    login,
    logout,
    refreshProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
