import { Button, Flex, Group, LoadingOverlay, rem, Stack, Textarea } from "@mantine/core";
import { useFetch } from "@mantine/hooks";
import { useAuth, type AuthContextProps } from "react-oidc-context";
import { Link, useNavigate, useParams } from "react-router";
import { headerHeight } from "./App";
import { useCallback, useState } from "react";
import { Recipe } from "./Recipe";
import { handleError } from "./main";


interface RecipeText {
    recipe: string
}

export interface UseSaveRecipeReturnValue {
    saveRecipe: (text: string) => Promise<any>;
    saving: boolean;
    error: Error | null;
}


const useSaveRecipe = (auth: AuthContextProps, recipeId?:string): UseSaveRecipeReturnValue => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    let url = recipeId ? `/api/recipe/edit/${recipeId}` : "/api/recipe/edit"

    const getRecipeId = (res:any): string => {
        if (recipeId) {
            return recipeId
        } else {
            const recipe = res as Recipe
            return recipe.recipe_id
        }
    }

    const saveRecipe = useCallback((recipeText: string): Promise<any> => {
        setSaving(true);

        return fetch(url, {
            method: recipeId ? "PUT" : "POST",
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipe: recipeText
            })
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((res) => {
                let recipeId = getRecipeId(res)
                setSaving(false)
                navigate(`/recipe/${recipeId}`)
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                return err;
            });
    }, [auth, recipeId, url])

    return { saveRecipe, saving: saving, error }
}

interface EditComponentParams {
    recipeId?: string;
    data:RecipeText|null;
    loading: boolean;
    auth: AuthContextProps;
}

const EditComponent = ({recipeId, data, loading, auth}:EditComponentParams) => {
    const { saveRecipe, saving, error } = useSaveRecipe(auth, recipeId)
    
    handleError(error)

    return (
        <>
            <LoadingOverlay visible={loading || saving} />
            <Flex direction="column" style={{
                height: `calc(100vh - (${rem(headerHeight)} + var(--mantine-spacing-md) * 2))`
            }}>
                <form style={{ height: "100%" }} onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const recipeText = formData.get('recipe-textarea') as string
                    saveRecipe(recipeText)
                }}>
                    <Stack style={{ height: "100%" }}>
                        <Textarea name="recipe-textarea" defaultValue={data?.recipe} style={{ height: "100%" }} size="md" styles={{
                            // 2. Make the inner wrapper a flex container that grows
                            wrapper: { height: '100%', display: 'flex', flexDirection: 'column' },
                            // 3. Force the native textarea HTML element to fill all available space
                            input: { flexGrow: 1, height: '100%' }
                        }}></Textarea>
                        <Group><Button type="submit">Save</Button><Button variant="outline" component={Link} to={recipeId ? `/recipe/${recipeId}` : "/"}>Cancel</Button></Group>
                    </Stack>
                </form>
            </Flex>
        </>
    )
}

export const CreateRecipe = () => {
    const auth = useAuth();

    return (
        <EditComponent data={null} loading={false} auth={auth}/>
    )
}

export const EditRecipe = () => {
    const auth = useAuth();
    const { recipeId } = useParams();
    const { data, loading, error } = useFetch<RecipeText>(
        `/api/recipe/edit/${recipeId}`,
        {
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            },
        }
    );

    handleError(error)

    return (
        <EditComponent recipeId={recipeId} data={data} loading={loading} auth={auth} />
    )
}