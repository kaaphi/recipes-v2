import { AppShell, Autocomplete, Highlight, NavLink, Stack, type AutocompleteProps, type ComboboxItem, type NavLinkProps, type OptionsFilter } from "@mantine/core";
import { HouseIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, SignInIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { useAuth } from "react-oidc-context";
import { NavLink as RouterNavLink, useNavigate, useParams } from 'react-router';
import type { UseUserRecipesReturnValue } from "./Recipes";
import { useState } from "react";


type NavBarProps = {
    link?: string
    authCondition?: string
} & NavLinkProps;

const NavItem = (props: NavBarProps) => {
    const auth = useAuth();

    var { link, authCondition = "requireAuth", ...others } = props;

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



type NavBarParams = {
    closeNavBar: () => void;
    userRecipes: UseUserRecipesReturnValue;
}
type SearchBarParams = NavBarParams

const SearchBar = ({ userRecipes }: SearchBarParams) => {
    const auth = useAuth();
    if (auth.isAuthenticated) {
        const recipeTitles = userRecipes.data?.recipes?.map(r => r.title)
        const [value, setValue] = useState('');
        const navigate = useNavigate();

        const renderOption: AutocompleteProps['renderOption'] = ({ option }) => (
            <Highlight
                highlight={value}
                highlightStyles={{ fontWeight: 'bold', background: 'transparent', color: 'inherit' }}
            >
                {option.value}
            </Highlight>
        );

        const optionsFilter: OptionsFilter = ({ options, search }) => {
            if (search.length == 0) {
                return []
            }

            const filtered = (options as ComboboxItem[]).filter((option) =>
                option.label.toLowerCase().trim().includes(search.toLowerCase().trim())
            );

            filtered.sort((a, b) => {
                const aStartsWithMatch = a.label.toLowerCase().startsWith(search.toLowerCase())
                const bStartsWithMatch = b.label.toLowerCase().startsWith(search.toLowerCase())
                if (aStartsWithMatch && !bStartsWithMatch) {
                    return -1
                } else if (bStartsWithMatch && !aStartsWithMatch) {
                    return 1
                } else {
                    return a.label.localeCompare(b.label)
                }
            });

            return filtered;
        };


        return (
            <Stack style={{ marginInline: "var(--mantine-spacing-xs)" }}>
                <form onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const searchText = formData.get('search-box') as string
                    if (searchText) {
                        setValue("")
                        navigate(`/search?q=${searchText}`)
                    }
                }}>
                    <Autocomplete placeholder="Search" leftSection={<MagnifyingGlassIcon size={16} />} name="search-box" data={recipeTitles} value={value} onChange={setValue} renderOption={renderOption} filter={optionsFilter} type="search" />
                    {/* <Button type="submit">Search</Button> */}
                </form>
            </Stack>
        )
    }
}

export const NavBar = ({ closeNavBar, userRecipes }: NavBarParams) => {
    const auth = useAuth();
    const { recipeId } = useParams();

    const signOutRedirect = () => {
        auth.removeUser();
        const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
        const logoutUri = `${window.location.origin}/`;
        const domain = import.meta.env.VITE_OAUTH_DOMAIN;
        window.location.href = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    };

    return (
        <>
            <AppShell.Section grow>
                <NavItem label="Home" leftSection={<HouseIcon size={16} />} link={auth.isAuthenticated ? "/" : "/login"} onClick={closeNavBar} authCondition="always" />
                <NavItem label="New Recipe" leftSection={<PlusIcon size={16} />} link="/new" onClick={closeNavBar} />
                <NavItem label="Edit Recipe" leftSection={<PencilSimpleIcon size={16} />} link={`/recipe/${recipeId}/edit`} onClick={closeNavBar} disabled={!recipeId} />
                <NavItem label="Sign in" leftSection={<SignInIcon size={16} />} onClick={() => auth.signinRedirect()} authCondition="requireNoAuth" />
                <SearchBar userRecipes={userRecipes} closeNavBar={closeNavBar} />
            </AppShell.Section>

            <AppShell.Section>
                <NavItem label={auth.user?.profile.email} href="#required-for-focus" leftSection={<UserIcon size={16} />}>
                    <NavItem label="Sign out" leftSection={<SignOutIcon size={16} />} onClick={() => {
                        closeNavBar();
                        signOutRedirect();
                    }} />
                </NavItem>
            </AppShell.Section>
        </>
    );
}
