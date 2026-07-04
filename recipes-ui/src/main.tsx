import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App, { Login } from './App.tsx';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { WebStorageStateStore, type User } from 'oidc-client-ts';
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { LoadingOverlay, MantineProvider, Title } from '@mantine/core';
import { MyRecipes, SharedRecipes } from './AllRecipes.tsx';
import { CreateRecipe, EditRecipe } from './EditRecipe.tsx';
import { notifications, Notifications } from '@mantine/notifications';
import { XIcon } from '@phosphor-icons/react';
import { theme } from './Theme.tsx';
import { SearchResults } from './SearchResults.tsx';
import { RecipeView } from './Recipe.tsx';


const cognitoAuthConfig = {
  authority: import.meta.env.VITE_OAUTH_AUTHORITY,
  client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
  redirect_uri: `${window.location.origin}/oidc_callback`,
  response_type: "code",
  scope: "openid",
  // This tells the library to persist the session across browser closes
  userStore: new WebStorageStateStore({ store: window.localStorage }), 

  onSigninCallback: (_user :  User | undefined) => {
    // Remove authentication payload from URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }
};

const NotFound = () => {
  return (
    <Title>NOT FOUND!</Title>
  )
}

type AuthWrapperProps = {
  expectAuthenticated?: boolean,
  children?: React.ReactNode
}

const AuthWrapper = ({expectAuthenticated=true, children} : AuthWrapperProps) => {
  const auth = useAuth();

  if (auth.error) {
    return (<div>Authentication error... {auth.error.message}</div>);
  }

  if (!auth.isLoading) {
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

export const handleError = (error: Error | null, message?: string, title?: string) => {
  useEffect(() => {
    if (!error) {
      return
    }

    notifications.show({
      title: title ? title : "Error",
      message: message ? message : `${error}`,
      icon: <XIcon />,
      color: "red",
      autoClose: false,
      position: "top-center"
    })
  }, [error])
}

// wrap the application with AuthProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <MantineProvider theme={theme}>
        <Notifications />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<AuthWrapper><MyRecipes /></AuthWrapper>} />
              <Route path="/oidc_callback/*" element={<AuthWrapper expectAuthenticated={false} />} />
              <Route path="/shared/:userId" element={<AuthWrapper><SharedRecipes /></AuthWrapper>} />
              <Route path="/recipe/:recipeId" element={<AuthWrapper><RecipeView /></AuthWrapper>} />
              <Route path="/search" element={<AuthWrapper><SearchResults /></AuthWrapper>} />
              <Route path="/recipe/:recipeId/edit" element={<AuthWrapper><EditRecipe /></AuthWrapper>} />
              <Route path="/new" element={<AuthWrapper><CreateRecipe /></AuthWrapper>} />
              <Route path="/login" element={<AuthWrapper expectAuthenticated={false}><Login /></AuthWrapper>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </AuthProvider>
  </StrictMode>,
)