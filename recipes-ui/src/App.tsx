// import './App.css'
import { useAuth } from 'react-oidc-context'
import '@mantine/core/styles.css';
import { Button, MantineProvider, Title } from '@mantine/core';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';



function App() {
  const auth = useAuth();
   const [opened, { toggle }] = useDisclosure();

  const signOutRedirect = () => {
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
    const logoutUri = `${window.location.origin}/`;
    const domain = import.meta.env.VITE_OAUTH_DOMAIN;
    window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const AppInternal = () => {
    if (auth.isLoading) {
      return <div>Loading...</div>;
    }

    if (auth.error) {
      return <div>Encountering error... {auth.error.message}</div>;
    }

    if (auth.isAuthenticated) {
      return (
        <div>
          <pre> Hello: {auth.user?.profile.email} </pre>
          <pre> ID Token: {auth.user?.id_token} </pre>
          <pre> Access Token: {auth.user?.access_token} </pre>
          <pre> Refresh Token: {auth.user?.refresh_token} </pre>

          <Button onClick={() => auth.removeUser()}>Sign out</Button>
        </div>
      );
    }

    return (
      <div>
        <Button onClick={() => auth.signinRedirect()}>Sign in</Button>
        <Button onClick={() => signOutRedirect()}>Sign out</Button>
      </div>
  );
  }

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
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
          />

          <Title order={1}>Recipes</Title>
        </AppShell.Header>

        <AppShell.Navbar>Navbar</AppShell.Navbar>

        <AppShell.Main><AppInternal /></AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App
