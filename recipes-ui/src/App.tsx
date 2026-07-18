import { ActionIcon, Center, Group, MantineProvider, Title } from '@mantine/core';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate } from 'react-router';
import { NavBar } from './Navbar';
import { RecipeContext, useAuthFetch, type UserRecipes } from './Recipes';
import { useEffect, useState, type ReactNode } from 'react';
import CookingPotIcon from './assets/cooking-pot.svg?react';
import { useAuth } from 'react-oidc-context';


export type RecipeState = {
  isSharedRecipe: boolean
}

export const Login = () => {
  return (
    <Center>
      <CookingPotIcon width={128} height={128} />
    </Center>
  );
}

export const headerHeight = 60

export type OutletContextType = {
  recipeState: RecipeState;
  setRecipeState: React.Dispatch<React.SetStateAction<RecipeState>>;
}

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
    const recipes = useAuthFetch<UserRecipes>("/api/user/recipes")

    return (
        <RecipeContext.Provider value={recipes}>
            {children}
        </RecipeContext.Provider>
    );
}

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const [recipeState, setRecipeState] = useState<RecipeState>({ isSharedRecipe: false })

  const auth = useAuth();

  useEffect(() => {
    // 1. Check if the user is loaded but the access token has expired
    if (!auth.isLoading && !auth.isAuthenticated && auth.user && auth.user.expired) {
      // 2. Check if a refresh token is present in the user profile
      if (auth.user.refresh_token) {
        console.log("Access token expired, but refresh token found. Renewing...");
        auth.signinSilent().catch((err) => {
          console.error("Silent renew failed, forcing login:", err);
          auth.signinRedirect();
        });
      } else {
        // No refresh token available, session is truly dead
        auth.signinRedirect();
      }
    }
  }, [auth]);

  const navigate = useNavigate()

  const context = {
    recipeState,
    setRecipeState
  }

  return (
    <MantineProvider>
      <RecipeProvider>
      <AppShell
        padding="md"
        header={{ height: headerHeight }}
        navbar={{
          width: 250,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <ActionIcon size={headerHeight - 5} variant='white' color='dark' onClick={() => navigate("/")}>
              <CookingPotIcon style={{ width: '70%', height: '70%' }} />
            </ActionIcon>
            <Title order={2}>Recipes</Title>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar><NavBar closeNavBar={close} context={context} /></AppShell.Navbar>

        <AppShell.Main><Outlet context={context} /></AppShell.Main>
      </AppShell>
      </RecipeProvider>
    </MantineProvider>
  );
}



export default App
