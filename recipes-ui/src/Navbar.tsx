import { NavLink, Stack, type NavLinkProps } from "@mantine/core";
import { HouseIcon, PencilSimpleIcon, PlusIcon, SignInIcon, SignOutIcon } from "@phosphor-icons/react";
import { useAuth } from "react-oidc-context";
import { NavLink as RouterNavLink, useParams } from 'react-router';


type NavBarProps = {
    link?: string
    authCondition?: string
} & NavLinkProps;

const NavItem = (props: NavBarProps) => {
    const auth = useAuth();

    var { link, authCondition="requireAuth", ...others } = props;

    var show = true
    switch (authCondition) {
        case "requireAuth":
            show = auth.isAuthenticated;
            break;
        case "requireNoAuth":
            show = !auth.isAuthenticated;
            break;
        case "always":
            show = true;
    }

    if (show) {
        if (link) {
            return (
                <NavLink
                    {...others}
                    renderRoot={({ className, ...others }) => (
                        <RouterNavLink className={className} to={link} {...others} />
                    )}
                />
            )
        } else {
            return (
                <NavLink
                    {...others}
                />
            )
        }
    
    }
}


export const NavBar = () => {
  const auth = useAuth();
  const { recipeId } = useParams();

  const signOutRedirect = () => {
    auth.removeUser();
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
    const logoutUri = `${window.location.origin}/`;
    const domain = import.meta.env.VITE_OAUTH_DOMAIN;
    window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  return (<Stack>
    <NavItem label="Home" leftSection={<HouseIcon size={16} />} link={auth.isAuthenticated ? "/" : "/login"} authCondition="always" />
    <NavItem label="New Recipe" leftSection={<PlusIcon size={16} />} link="/new" />
    <NavItem label="Edit Recipe" leftSection={<PencilSimpleIcon size={16} />} link={`/recipe/${recipeId}/edit`} disabled={!recipeId} />
    <NavItem label="Sign in" leftSection={<SignInIcon size={16} />} onClick={() => auth.signinRedirect()} authCondition="requireNoAuth" />
    <NavItem label="Sign out" leftSection={<SignOutIcon size={16} />} onClick={() => signOutRedirect()} />

  </Stack>
  );
}
