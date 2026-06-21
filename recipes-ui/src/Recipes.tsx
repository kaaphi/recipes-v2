import { useFetch, type UseFetchReturnValue } from "@mantine/hooks";
import { handleError } from "./main";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";

export interface RecipeStub {
    title: string,
    id: string,
}

export interface User {
    display_name: string
    users_shared: {
        id: string,
        display_name: string,
    }[]|undefined
}

export interface UserRecipes {
    user: User,
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

export const useAuthFetch = <T,>(url: string): UseFetchReturnValue<T> => {
    const auth = useAuth();

    const rv = useFetch<T>(
        url,
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

export const useSearchRecipes = (query: string): UseSearchRecipesReturnValue => {
    const params = new URLSearchParams({
        q: query
    });

    return useAuthFetch(`/api/user/recipes/search?${params.toString()}`)
}

export const useUserRecipes = (): UseUserRecipesReturnValue => {
    return useAuthFetch("/api/user/recipes")
}