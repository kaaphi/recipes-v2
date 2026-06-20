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

export type UseUserRecipesReturnValue = UseFetchReturnValue<UserRecipes>


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