import { createContext, useContext } from "react";

export class NotAuthorizedError extends Error {
  constructor() {
    super("Not authorized!");
    this.name = "NotAuthorizedError";
  }
}

export interface User { id: string; username: string; }

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean
  logout: () => void;
  login: () => void;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};