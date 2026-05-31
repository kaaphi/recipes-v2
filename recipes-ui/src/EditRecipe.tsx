import { Button, Flex, Group, LoadingOverlay, rem, Stack, Textarea } from "@mantine/core";
import { useFetch } from "@mantine/hooks";
import { useAuth } from "react-oidc-context";
import { useParams } from "react-router";
import { headerHeight } from "./App";


interface RecipeText {
    recipe: string
}


const useSaveRecipe = (isCreate:boolean) => {
    //TODO write this    
}

const EditComponent = ({data, loading}:{data:RecipeText|null, loading: boolean}) => {
    return (
        <>
            <LoadingOverlay visible={loading} />
            <Flex direction="column" style={{
                height: `calc(100vh - (${rem(headerHeight)} + var(--mantine-spacing-md) * 2))`
            }}>
                <form style={{ height: "100%" }} onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    console.log('Text area value:', formData.get('recipe-textarea'));
                }}>
                    <Stack style={{ height: "100%" }}>
                        <Textarea name="recipe-textarea" defaultValue={data?.recipe} style={{ height: "100%" }} size="md" styles={{
                            // 2. Make the inner wrapper a flex container that grows
                            wrapper: { height: '100%', display: 'flex', flexDirection: 'column' },
                            // 3. Force the native textarea HTML element to fill all available space
                            input: { flexGrow: 1, height: '100%' }
                        }}></Textarea>
                        {/* <div style={{ flex: 1, background: 'red' }}>Middle (Grows)</div> */}
                        <Group><Button type="submit">Save</Button><Button variant="outline">Cancel</Button></Group>
                    </Stack>
                </form>
            </Flex>
        </>
    )
}

export const CreateRecipe = () => {
    //TODO

    return (
        <EditComponent data={null} loading={false} />
    )
}

export const EditRecipe = () => {
    const auth = useAuth();
    const { recipeId } = useParams();
    const { data, loading, error, refetch, abort } = useFetch<RecipeText>(
        `/api/recipe/edit/${recipeId}`,
        {
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            },
        }
    );

    return (
        <EditComponent data={data} loading={loading} />
    )
}