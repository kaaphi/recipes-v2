import { Center, Group, MantineProvider, Title } from '@mantine/core';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router';
import { NavBar } from './Navbar';
import { useUserRecipes, type UseUserRecipesReturnValue } from './Recipes';
import { useState } from 'react';
import CookingPotIcon from '../public/favicon.svg?react'


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

export const scrollToElement = (elementId: string) => {
  //   document.getElementById(`letter_${letter}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  const element = document.getElementById(elementId)
  const elementRect = element!.getBoundingClientRect();
  const absoluteElementTop = elementRect.top + window.scrollY;
  window.scrollTo({
    top: absoluteElementTop - headerHeight,
    behavior: 'instant'
  });
};

export type OutletContextType = {
  userRecipes: UseUserRecipesReturnValue;
  recipeState: RecipeState;
  setRecipeState: React.Dispatch<React.SetStateAction<RecipeState>>;
}

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const userRecipes = useUserRecipes()
  const [recipeState, setRecipeState] = useState<RecipeState>({isSharedRecipe: false})

  const context = {
    userRecipes,
    recipeState,
    setRecipeState
  }

  return (
    <MantineProvider>
      <AppShell
        padding="md"
        header={{ height: headerHeight }}
        navbar={{
          width: 300,
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

            <Title order={1}>Recipes</Title>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar><NavBar closeNavBar={close} context={context} /></AppShell.Navbar>

        <AppShell.Main><Outlet context={context}/></AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App
