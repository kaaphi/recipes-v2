import { List, LoadingOverlay, Stack, Title, Typography } from "@mantine/core";
import { useFetch } from "@mantine/hooks";
import { Marked } from "@ts-stack/markdown";
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

const Ingredients = ({list} : {list: IngredientList}) => {
    return (
    <div>{list && <Title order={4}>{list.name}</Title>}
    <List>
        {list.ingredients.map((ingredient) => <List.Item>{ingredient}</List.Item>)}
    </List>
    </div>
    )
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
            <LoadingOverlay visible={loading} />
            <Stack>
            <Title order={1}>{data?.title}</Title>
            <Title order={3}>Ingredients</Title>
            {data?.ingredientLists.map((list) => <Ingredients list={list} />)}
            <Title order={3 }>Method</Title>
            <Typography>
            <div dangerouslySetInnerHTML={{__html: Marked.parse(data?.method || "")}} />
            </Typography>
            </Stack>
        </>
    );
}