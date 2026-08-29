import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { Login } from './App.tsx';
import { BrowserRouter, Route, Routes } from "react-router";
import { MantineProvider } from '@mantine/core';
import { ArchivedRecipes, MyRecipes, SharedRecipes } from './AllRecipes.tsx';
import { CreateRecipe, EditRecipe } from './EditRecipe.tsx';
import { Notifications } from '@mantine/notifications';
import { theme } from './Theme.tsx';
import { SearchResults } from './SearchResults.tsx';
import { RecipeView } from './Recipe.tsx';
import { AuthWrapper } from './AuthComponents.tsx';
import { NotFound } from './NotFound.tsx';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient()

// wrap the application with AuthProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MantineProvider theme={theme}>
          <Notifications />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<AuthWrapper><MyRecipes /></AuthWrapper>} />
                <Route path="/oidc_callback/*" element={<AuthWrapper expectAuthenticated={false} />} />
                <Route path="/archive" element={<AuthWrapper><ArchivedRecipes /></AuthWrapper>} />
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
    </QueryClientProvider>
  </StrictMode>,
)