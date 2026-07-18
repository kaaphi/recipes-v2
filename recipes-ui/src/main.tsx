import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { Login } from './App.tsx';
import { AuthProvider, type AuthProviderNoUserManagerProps } from 'react-oidc-context';
import { WebStorageStateStore, type User } from 'oidc-client-ts';
import { BrowserRouter, Route, Routes } from "react-router";
import { MantineProvider } from '@mantine/core';
import { MyRecipes, SharedRecipes } from './AllRecipes.tsx';
import { CreateRecipe, EditRecipe } from './EditRecipe.tsx';
import { Notifications } from '@mantine/notifications';
import { theme } from './Theme.tsx';
import { SearchResults } from './SearchResults.tsx';
import { RecipeView } from './Recipe.tsx';
import { AuthWrapper } from './AuthComponents.tsx';
import { NotFound } from './NotFound.tsx';


const cognitoAuthConfig : AuthProviderNoUserManagerProps = {
  authority: import.meta.env.VITE_OAUTH_AUTHORITY,
  client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
  redirect_uri: `${window.location.origin}/oidc_callback`,
  response_type: "code",
  scope: "openid",
  // This tells the library to persist the session across browser closes
  userStore: new WebStorageStateStore({ store: window.localStorage }), 
  automaticSilentRenew: true,

  onSigninCallback: (_user :  User | undefined) => {
    // Remove authentication payload from URL
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }
};

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