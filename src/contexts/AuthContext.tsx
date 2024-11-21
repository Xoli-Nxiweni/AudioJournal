import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { email: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type ProviderProps = {
    children: React.ReactNode;
  };
  
  export const AuthProvider: React.FC<ProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<{ email: string } | null>(null);
  
    const login = async (email: string, password: string): Promise<boolean> => {
      // Mock authentication - replace with real logic (e.g., Firebase, API)
      if (email === 'user@example.com' && password === 'password123') {
        setIsAuthenticated(true);
        setUser({ email });
        return true;
      }
      return false;
    };
  
    const signup = async (email: string, password: string): Promise<boolean> => {
      // Mock signup - replace with real logic (e.g., Firebase, API)
      if (email && password) {
        setIsAuthenticated(true);
        setUser({ email });
        return true;
      }
      return false;
    };
  
    const logout = () => {
      setIsAuthenticated(false);
      setUser(null);
    };
  
    return (
      <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout }}>
        {children}
      </AuthContext.Provider>
    );
  };
  

