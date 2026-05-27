import { Title } from "@mantine/core";
import { useFetch } from "@mantine/hooks";
import { useAuth } from "react-oidc-context";
import { useParams } from "react-router";

interface IngredientList {
    name?: string,
    ingredients: string[]
}

interface Recipe {
    title: string,
    id: string,
    method: string,
    sources: string[],
    ingredientLists: IngredientList[]
}

export const Recipe = () => {
    const auth = useAuth();
    const { recipeId } = useParams();
    const { data, loading, error, refetch, abort } = useFetch<Recipe>(
        `/api/recipe/${recipeId}`,
        {
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            }
        }
    );


    return (
        <>
            <Title order={2}>{data?.title}</Title>
            <div>
            {data?.method}
            </div>
        </>
    );
}