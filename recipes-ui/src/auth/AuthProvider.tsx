import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextType } from "./AuthHooks";
import type { User } from "oidc-client-ts";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        fetch("/authorizedUser")
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
        
        // try {
        //     const response = await api.get('/api/me');
        //     setUser(response.data);
        // } catch {
        //     setUser(null);
        // } finally {
        //     setLoading(false);
        // }
    };

    const logout = () => {
        setUser(null);
        // Optional: Call BFF logout endpoint to clear the server session/cookie
        //api.post('/api/logout').catch(() => { });
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const value = {user, loading, logout } as AuthContextType
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

