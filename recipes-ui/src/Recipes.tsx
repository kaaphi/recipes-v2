import { useFetch, type UseFetchReturnValue } from "@mantine/hooks";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { XIcon } from "@phosphor-icons/react";

export interface IngredientList {
    name?: string;
    ingredients: string[];
}

export interface Recipe extends Record<string, unknown> {
    title: string;
    recipe_id: string;
    user_id: string;
    method: string;
    sources: string[];
    ingredientLists: IngredientList[];
    created_at: string
    updated_at?: string | null
}

export interface RecipeStub {
    title: string,
    id: string,
}

export const stubFromRecipe = (recipe: Recipe): RecipeStub => {
    return { title: recipe.title, id: recipe.recipe_id }
}

export interface User {
    display_name: string
    users_shared: {
        id: string,
        display_name: string,
    }[] | undefined
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

    const { refetch } = rv

    useEffect(() => {
        if (auth.isAuthenticated && auth.user?.access_token) {
            refetch();
        }
    }, [auth.isAuthenticated, auth.user, refetch]);

    useEffect(() => {
        if (!rv.error) {
            return
        }

        notifications.show({
            title: "Error",
            message: `${rv.error}`,
            icon: <XIcon />,
            color: "red",
            autoClose: false,
            position: "top-center"
        })
    }, [rv.error])

    return rv;
}

export const handleDates = <T extends Record<string, unknown>>(obj: T, ...dateAttributes: string[]): T => {
    const rv = { ...obj } as Record<string, unknown>;

    dateAttributes.forEach((a) => {
        const value = obj[a] as string
        if (value) {
            const date = new Date(value)
            rv[a] = date as unknown
        }
    })

    return rv as T
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