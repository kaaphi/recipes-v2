// import './App.css'
import { useAuth } from 'react-oidc-context';
import '@mantine/core/styles.css';
import { Center, Group, MantineProvider, Title } from '@mantine/core';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet } from 'react-router';
import { NavBar } from './Navbar';
import { CookingPotIcon } from '@phosphor-icons/react';

export const Home = () => {
  const auth = useAuth();

  return (
    <Title order={3}>Hello {auth.user?.profile.email}!</Title>
  );
}

export const Login = () => {
   return (
    <Center>
    <CookingPotIcon size={128} />
    </Center>
  );
}


export const App = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineProvider>
      <AppShell
        padding="md"
        header={{ height: 60 }}
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

        <AppShell.Navbar><NavBar /></AppShell.Navbar>

        <AppShell.Main><Outlet /></AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App
