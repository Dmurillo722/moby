import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  loginUser,
  registerUser,
  type User,
  type UserLoginInfo,
} from "@/endpoint_connections/auth_endpoint";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "moby:auth";

const parseStorage = (): AuthState => {
  if (typeof window === "undefined")
    return { user: null, token: null, loading: false, error: null };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { user: null, token: null, loading: false, error: null };
  try {
    const parsed = JSON.parse(raw) as { user: User; token: string };
    return {
      user: parsed.user,
      token: parsed.token,
      loading: false,
      error: null,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { user: null, token: null, loading: false, error: null };
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => parseStorage().user);
  const [token, setToken] = useState<string | null>(() => parseStorage().token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const auth = await loginUser({ email, password });
      const userData: User = {
        id: auth.user_id,
        email,
        name: auth.name ?? "Unknown",
        phone: auth.phone ?? "",
      };
      setToken(auth.access_token);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const created = await registerUser({ name, email, phone, password });
      const fakeToken = "REGISTERED_NOT_LOGGED_IN";
      setUser(created);
      setToken(fakeToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    setLoading(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      error,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
    }),
    [user, token, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
