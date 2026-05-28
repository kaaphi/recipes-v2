import '@mantine/core/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { Login } from './App.tsx';
import { AuthProvider, useAuth } from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Title } from '@mantine/core';
import { AllRecipes } from './AllRecipes.tsx';
import { Recipe } from './Recipe.tsx';


const cognitoAuthConfig = {
  authority: import.meta.env.VITE_OAUTH_AUTHORITY,
  client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
  redirect_uri: `${window.location.origin}/oidc_callback`,
  response_type: "code",
  scope: "openid",
  onSigninCallback: (_user :  User | undefined) => {
    // Remove authentication payload from URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
    
    // Redirect to main page
    window.location.href = "/"; 
  }
};

const NotFound = () => {
  return (
    <Title>NOT FOUND!</Title>
  )
}

type AuthWrapperProps = {
  expectAuthenticated?: boolean,
  children: React.ReactNode
}

const AuthWrapper = ({expectAuthenticated=true, children} : AuthWrapperProps) => {
  const auth = useAuth();

  if (auth.isLoading) {
    return (<div>Loading...</div>);
  }

  if (auth.error) {
    return (<div>Authentication error... {auth.error.message}</div>);
  }

  if (expectAuthenticated && !auth.isAuthenticated) {
    return (<Navigate to="/login" replace />);
  }

  if (!expectAuthenticated && auth.isAuthenticated) {
    return (<Navigate to="/" replace />);
  }

  return (children);
}

// wrap the application with AuthProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<AuthWrapper><AllRecipes /></AuthWrapper>} />
            <Route path="/oidc_callback/*" element={<AuthWrapper><AllRecipes /></AuthWrapper>} />
            <Route path="/recipe/:recipeId" element={<AuthWrapper><Recipe /></AuthWrapper>} />
            <Route path="/login" element={<AuthWrapper expectAuthenticated={false}><Login /></AuthWrapper>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)