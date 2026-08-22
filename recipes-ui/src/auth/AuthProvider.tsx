import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType, type User } from "./AuthHooks";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setLoading] = useState(true);

    const checkAuth = async () => {
        fetch("/api/authorizedUser")
        .then((res) => {
            if(!res.ok) {
                throw new Error(`UserrRequest failed with status ${res.status}`)
            }
            return res.json()
        })
        .then((res) => {
            setUser(res as User)    
        })
        .catch((_) => {
                setUser(null)
            })
        .finally(() => {
            setLoading(false)
        })
    };

    const logout = () => {
        setUser(null);
        const logoutUri = `${window.location.origin}/`;
        window.location.href = `/api/logout?logout_redirect_uri=${encodeURIComponent(logoutUri)}`
    };

    const login = () => {
        window.location.href = "/api/login"
    }

    useEffect(() => {
        checkAuth();
    }, []);

    const value = {user, isLoading, logout, isAuthenticated: !!user, login } as AuthContextType
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

