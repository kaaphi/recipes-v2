import { AppShell, Autocomplete, CloseButton, Highlight, NavLink, Stack, type AutocompleteProps, type ComboboxItem, type NavLinkProps, type OptionsFilter } from "@mantine/core";
import { BookBookmarkIcon, BookOpenTextIcon, HouseIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, SignInIcon, SignOutIcon, UserIcon, UserListIcon } from "@phosphor-icons/react";
import { useAuth } from "react-oidc-context";
import { NavLink as RouterNavLink, useNavigate, useParams } from 'react-router';
import type { User } from "./Recipes";
import { useCallback, useRef, useState } from "react";
import type { OutletContextType } from "./App";
import { useRecentRecipes } from "./RecentRecipes";

const NAV_ICON_SIZE = 24

type NavBarProps = {
    link?: string
    authCondition?: string
    href?: string
} & NavLinkProps;

const NavItem = (props: NavBarProps) => {
    const auth = useAuth();

    const { link, authCondition = "requireAuth", ...others } = props;

    let show = true
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
    context: OutletContextType;
}
type SearchBarParams = NavBarParams

const SearchBar = ({ context, closeNavBar }: SearchBarParams) => {
    const auth = useAuth();
    const [value, setValue] = useState('');
    const navigate = useNavigate();
    const formRef = useRef<HTMLFormElement>(null);

    if (auth.isAuthenticated) {
        const recipeTitles = [... new Set(context.userRecipes.data?.recipes?.map(r => r.title))]

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

        
        const handleSubmit = (
            event?: React.SubmitEvent<HTMLFormElement>,
            overrideValue?: string
        ) => {
            event?.preventDefault();

            // Use the override string if provided; otherwise fall back to state
            const searchText = overrideValue !== undefined ? overrideValue : value;
            if (searchText) {
                navigate(`/search?q=${encodeURIComponent(searchText)}`)
                // Defer resetting the state until Mantine's click cycle finishes
                queueMicrotask(() => {
                    setValue("");
                });
            }
            closeNavBar()
        }

        const onOptionSubmit = (option: string) => {
            console.log(`Options submitted: ${option}  ${typeof option}`)
            handleSubmit(undefined, option)
        }

        return (
            <Stack style={{ marginInline: "var(--mantine-spacing-xs)" }}>
                <form ref={formRef} onSubmit={(event) => handleSubmit(event)}>
                    <Autocomplete placeholder="Search" leftSection={<MagnifyingGlassIcon size={NAV_ICON_SIZE} />} name="search-box" data={recipeTitles} value={value} onChange={setValue} renderOption={renderOption} filter={optionsFilter} type="search" onOptionSubmit={onOptionSubmit} clearable/>
                </form>
            </Stack>
        )
    }
}

type OtherRecipesParams = {
    user?: User;
    closeNavBar: () => void;
}

const OtherRecipes = ({ user, closeNavBar }: OtherRecipesParams) => {
    if (user?.users_shared) {
        return (
            <NavItem label="Other Recipes" href="#required-for-focus" leftSection={<BookOpenTextIcon size={NAV_ICON_SIZE} />}>
                {user.users_shared.map((user) => <NavItem onClick={closeNavBar} key={user.id} leftSection={<UserListIcon size={NAV_ICON_SIZE}/>} label={user.display_name} link={`/shared/${user.id}`}/>)}
            </NavItem>
        )
    }
}

type RecentRecipesParams = {
    closeNavBar: () => void;
}

const RecentRecipes = ({closeNavBar}: RecentRecipesParams) => {
    const {recentRecipes, removeRecentRecipe} = useRecentRecipes()

    const handleRemove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Stops the event from bubbling up to parent elements
        e.preventDefault();  // Stops the router/browser from changing the URL

        // Read the custom data attribute directly from the DOM node
        const id = e.currentTarget.getAttribute('data-recipe-id');
        if (id) {
            removeRecentRecipe(id);
        }
    }, [removeRecentRecipe]);

    return (
        <NavItem label="Recent Recipes" href="#required-for-focus" leftSection={<BookBookmarkIcon size={NAV_ICON_SIZE} />}>
            {recentRecipes?.map((recentRecipe) => <NavItem key={recentRecipe.id} label={recentRecipe.title} onClick={closeNavBar} link={`/recipe/${recentRecipe.id}`} rightSection={<CloseButton data-recipe-id={recentRecipe.id}  onClick={handleRemove}/>}/>)}
        </NavItem>
    )
}

export const NavBar = ({ closeNavBar, context }: NavBarParams) => {
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
                <NavItem label="Home" leftSection={<HouseIcon size={NAV_ICON_SIZE} />} link={auth.isAuthenticated ? "/" : "/login"} onClick={closeNavBar} authCondition="always" />
                <OtherRecipes user={context.userRecipes.data?.user} closeNavBar={closeNavBar}/>
                <RecentRecipes closeNavBar={closeNavBar}/>
                <NavItem label="New Recipe" leftSection={<PlusIcon size={NAV_ICON_SIZE} />} link="/new" onClick={closeNavBar} />
                <NavItem label="Edit Recipe" leftSection={<PencilSimpleIcon size={NAV_ICON_SIZE} />} link={`/recipe/${recipeId}/edit`} onClick={closeNavBar} disabled={!recipeId || context.recipeState.isSharedRecipe} />
                <NavItem label="Sign in" leftSection={<SignInIcon size={NAV_ICON_SIZE} />} onClick={() => auth.signinRedirect()} authCondition="requireNoAuth" />
                <SearchBar context={context} closeNavBar={closeNavBar} />
            </AppShell.Section>

            <AppShell.Section>
                <NavItem label={auth.user?.profile.email} href="#required-for-focus" leftSection={<UserIcon size={NAV_ICON_SIZE} />}>
                    <NavItem label="Sign out" leftSection={<SignOutIcon size={NAV_ICON_SIZE} />} onClick={() => {
                        closeNavBar();
                        signOutRedirect();
                    }} />
                </NavItem>
            </AppShell.Section>
        </>
    );
}
