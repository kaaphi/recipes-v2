import { LoadingOverlay } from "@mantine/core";
import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router";

export type AuthWrapperProps = {
    expectAuthenticated?: boolean,
    children?: React.ReactNode
}

export const AuthWrapper = ({ expectAuthenticated = true, children }: AuthWrapperProps) => {
    const auth = useAuth();

    console.log(`expectAuthenticated: ${expectAuthenticated} authed: ${auth.isAuthenticated} loading: ${auth.isLoading} error: ${auth.error}`)

    if (!auth.isLoading) {
        if (auth.error) {
            return (<div>Authentication error... {auth.error.message}</div>);
        }

        if (expectAuthenticated && !auth.isAuthenticated) {
            console.log("Not logged in, redirecting to /login")
            return (<Navigate to="/login" replace />);
        }

        if (!expectAuthenticated && auth.isAuthenticated) {
            console.log("Logged in, redirecting to /")
            return (<Navigate to="/" replace />);
        }
    }

    return (
        <>
            <LoadingOverlay visible={auth.isLoading} loaderProps={{ children: 'Logging you in...' }} />
            {children}
        </>

    );
}