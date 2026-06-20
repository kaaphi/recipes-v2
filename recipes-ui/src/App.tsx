import { Center, Group, MantineProvider, Title } from '@mantine/core';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router';
import { NavBar } from './Navbar';
import { CookingPotIcon } from '@phosphor-icons/react';
import { useUserRecipes, type UseUserRecipesReturnValue } from './Recipes';


export const Login = () => {
   return (
    <Center>
    <CookingPotIcon size={128} />
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
    behavior: 'smooth'
  });
};

export type OutletContextType = {
  userRecipes: UseUserRecipesReturnValue
}

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const userRecipes = useUserRecipes()

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

        <AppShell.Navbar><NavBar closeNavBar={close} userRecipes={userRecipes} /></AppShell.Navbar>

        <AppShell.Main><Outlet context={{userRecipes}}/></AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App
