import { useFetch, type UseFetchReturnValue } from "@mantine/hooks";
import { handleError } from "./main";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";

export interface RecipeStub {
    title: string,
    id: string,
}
export interface UserRecipes {
    user: {
        display_name: string
    },
    recipes: RecipeStub[]
}

export interface RecipeSearchResult {
    title: string,
    id: string,
    match_context: string,
    match_type: string,
    score: number
}

export type UseUserRecipesReturnValue = UseFetchReturnValue<UserRecipes>
export type UseSearchRecipesReturnValue = UseFetchReturnValue<RecipeSearchResult[]>

export const useSearchRecipes = (query: string): UseSearchRecipesReturnValue => {
    const auth = useAuth();

    const params = new URLSearchParams({
        q: query
    });

    const rv = useFetch<RecipeSearchResult[]>(
        `/api/user/recipes/search?${params.toString()}`,
        {
            autoInvoke: false,
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            }
        }
    );

    useEffect(() => {
        if (auth.isAuthenticated && auth.user?.access_token) {
            rv.refetch();
        }
    }, [auth.isAuthenticated, auth.user, rv.refetch]);

    handleError(rv.error)

    return rv
}

export const useUserRecipes = (): UseUserRecipesReturnValue => {
    const auth = useAuth();

    const rv = useFetch<UserRecipes>(
        "/api/user/recipes",
        {
            autoInvoke: false,
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            }
        }
    );

    useEffect(() => {
        if (auth.isAuthenticated && auth.user?.access_token) {
            rv.refetch();
        }
    }, [auth.isAuthenticated, auth.user, rv.refetch]);

    handleError(rv.error)

    return rv
}