import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RegisterPayload, LoginPayload, UpdateProfilePayload } from '../types';
import { authApi, authStorage } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  backendOnline: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ success: boolean; message?: string }>;
  checkBackend: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  const checkBackend = useCallback(async () => {
    const status = await authApi.checkBackendHealth();
    setBackendOnline(status.online);
    return status.online;
  }, []);

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      await checkBackend();
      const token = authStorage.getToken();
      if (token) {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        } else if (!authStorage.getUser()) {
          authStorage.clear();
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, [checkBackend]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    const res = await authApi.login(payload);
    if (res.success && res.data) {
      setUser(res.data.user);
    }
    setIsLoading(false);
    return res;
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    const res = await authApi.register(payload);
    if (res.success && res.data) {
      setUser(res.data.user);
    }
    setIsLoading(false);
    return res;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const res = await authApi.updateProfile(payload);
    if (res.success && res.data) {
      setUser(res.data);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        backendOnline,
        login,
        register,
        logout,
        updateProfile,
        checkBackend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
