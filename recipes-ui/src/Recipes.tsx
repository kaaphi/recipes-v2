import { useFetch, type UseFetchReturnValue } from "@mantine/hooks";
import { handleError } from "./main";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";

export interface IngredientList {
    name?: string;
    ingredients: string[];
}

export interface Recipe {
    title: string;
    recipe_id: string;
    user_id: string;
    method: string;
    sources: string[];
    ingredientLists: IngredientList[];
    created_at: Date
    updated_at?: Date|null
}

export interface RecipeStub {
    title: string,
    id: string,
}

export const stubFromRecipe = (recipe: Recipe): RecipeStub => {
    return {title: recipe.title, id: recipe.recipe_id}
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

export const useAuthFetch = <T extends Record<string,any>,>(url: string, ...dateAttributes: string[]): UseFetchReturnValue<T> => {
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

    if (rv.data) {
        rv.data = handleDates(rv.data, ...dateAttributes)
    }

    return rv
}

export const handleDates = <T extends Record<string,any>>(obj: T, ...dateAttributes: string[]): T => {
    const rv = { ...obj } as any;
    
    dateAttributes.forEach((a) => {
        const value = obj[a]
        if (value) {
            const date = new Date(value)
            rv[a] = date as any
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