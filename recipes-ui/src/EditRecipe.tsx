import { Alert, Button, Divider, Flex, Group, LoadingOverlay, Menu, Modal, rem, Space, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { Link, useNavigate, useParams, type NavigateFunction } from "react-router";
import { headerHeight } from "./App";
import { useState } from "react";
import { type RecipeTextRequest, useAuthFetch, useUserRecipes, type Recipe, type RecipeTextResponse, type RecipeUpdate } from "./Recipes";
import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { useDisclosure } from "@mantine/hooks";
import { useAuthMutate } from "./api/ApiHooks";
import type { UseMutationResult } from "@tanstack/react-query";

const useModifyRecipe = <TData,TVariables>(method: string, url: string, refreshRecipesOnSuccess: boolean, onSuccessAction: (navigate: NavigateFunction, data: TData) => void): UseMutationResult<TData, Error, TVariables> => {
    const { refetch: refreshRecipes } = useUserRecipes()
    const navigate = useNavigate()

    const rv = useAuthMutate<TData,TVariables>(url, method, {
        onSuccess: (data) => {
            if (refreshRecipesOnSuccess) {
                refreshRecipes()
            }
            onSuccessAction(navigate, data)
        }
    });

    return rv

}

type ConfirmModalParams = {
    opened: boolean,
    close: () => void,
} & ManageRecipeMenuParams

const ConfirmArchiveUnarchiveModal = ({ opened, close, recipeId, recipe }: ConfirmModalParams) => {
    const { mutate, isPending } = useModifyRecipe<unknown, RecipeUpdate>("PUT", `/api/recipe/${recipeId}`, true, (navigate) => {
        if (recipe.is_archived) {
            navigate(`/recipe/${recipeId}`)
        } else {
            navigate("/")
        }
    })

    const archiveBody: RecipeUpdate = {
        is_archived: !recipe.is_archived
    }

    return <Modal opened={opened} onClose={close} title={recipe.is_archived ? "Unarchive Recipe" : "Archive Recipe"}>
        <LoadingOverlay visible={isPending} />
        <Stack>
            <Text>Please confirm that you want to {recipe.is_archived ? "unarchive" : "archive"} <Text span fw={700}>{recipe.title}</Text>.</Text>
            <Divider />
            <Group justify="flex-end"><Button onClick={() => mutate(archiveBody)}>{recipe.is_archived ? "Unarchive" : "Archive"} Recipe</Button><Button variant="outline" onClick={close}>Cancel</Button></Group>
        </Stack>
    </Modal>
}

const ConfirmDeleteModal = ({ opened, close, recipeId, recipe }: ConfirmModalParams) => {
    const [confirmValue, setConfirmValue] = useState('');

    const { mutate, isPending } = useModifyRecipe("DELETE", `/api/recipe/${recipeId}?is_archived=${recipe.is_archived}`, true, (navigate) => {
        setConfirmValue("")
        navigate("/")
    })

    const doClose = () => {
        setConfirmValue("")
        close()
    }

    return <Modal opened={opened} onClose={doClose} title="Delete Recipe">
        <LoadingOverlay visible={isPending} />
        <Stack>
            <Text>Please confirm that you want to delete <Text span fw={700}>{recipe.title}</Text>.</Text>
            <Alert color="yellow" icon={<WarningIcon />}>Deleting a recipe cannot be undone!</Alert>
            <Text>To confirm this deletion, type "confirm".</Text>
            <TextInput placeholder="confirm" value={confirmValue} onChange={(event) => setConfirmValue(event.currentTarget.value)} />
            <Divider />
            <Group justify="flex-end"><Button disabled={confirmValue !== "confirm"} onClick={() => mutate()}>Delete Recipe</Button><Button variant="outline" onClick={doClose}>Cancel</Button></Group>
        </Stack>
    </Modal>
}


type ManageRecipeMenuParams = {
    recipeId: string,
    recipe: RecipeTextResponse,
}

const ManageRecipeMenu = ({ recipeId, recipe }: ManageRecipeMenuParams) => {
    const [confirmArchiveOpened, confirmArchiveHandlers] = useDisclosure(false);
    const [confirmDeleteOpened, confirmDeleteHandlers] = useDisclosure(false);

    return <>
        <ConfirmArchiveUnarchiveModal opened={confirmArchiveOpened} close={confirmArchiveHandlers.close} recipeId={recipeId} recipe={recipe} />
        <ConfirmDeleteModal opened={confirmDeleteOpened} close={confirmDeleteHandlers.close} recipeId={recipeId} recipe={recipe} />
        <Menu>
            <Menu.Target>
                <Button variant="subtle">Actions</Button>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Manage Recipe</Menu.Label>
                <Menu.Item onClick={confirmArchiveHandlers.open}>{recipe.is_archived ? "Unarchive" : "Archive"} Recipe</Menu.Item>
                <Menu.Item onClick={confirmDeleteHandlers.open}>Delete Recipe</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    </>
}


interface EditComponentParams {
    recipeId?: string;
    data: RecipeTextResponse | null;
    loading: boolean;
}


const EditComponent = ({ recipeId, data, loading }: EditComponentParams) => {
    const method = recipeId ? "PUT" : "POST"
    const url = recipeId ? `/api/recipe/edit/${recipeId}` : "/api/recipe/edit"

    const { mutate, isPending } = useModifyRecipe<Recipe,RecipeTextRequest>(method, url, !recipeId, (navigate, data) => {
        const resultRecipeId = recipeId || data.recipe_id
        navigate(`/recipe/${resultRecipeId}`)
    })

    return (
        <>
            <LoadingOverlay visible={loading || isPending} />
            <Flex direction="column" style={{
                height: `calc(100vh - (${rem(headerHeight)} + var(--mantine-spacing-md) * 2))`
            }}>
                <form style={{ height: "100%" }} onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const recipeText = formData.get('recipe-textarea') as string
                    const recipeTextRequest: RecipeTextRequest = { recipe: recipeText }
                    mutate(recipeTextRequest)
                }}>
                    <Stack style={{ height: "100%" }}>
                        {data?.is_archived && <Alert icon={<InfoIcon />}>Archived recipes cannot be edited. Use the Actions menu to unarchive or delete this recipe.</Alert>}
                        <Textarea name="recipe-textarea" disabled={data?.is_archived} defaultValue={data?.recipe} style={{ height: "100%" }} size="md" styles={{
                            // 2. Make the inner wrapper a flex container that grows
                            wrapper: { height: '100%', display: 'flex', flexDirection: 'column' },
                            // 3. Force the native textarea HTML element to fill all available space
                            input: { flexGrow: 1, height: '100%' }
                        }}></Textarea>
                        <Group>
                            <Button type="submit" disabled={data?.is_archived}>Save</Button>
                            <Button variant="outline" component={Link} to={recipeId ? `/recipe/${recipeId}` : "/"}>Cancel</Button>
                            {recipeId && data && <><Space style={{ flex: 1 }} /><ManageRecipeMenu recipeId={recipeId} recipe={data} /></>}
                        </Group>
                    </Stack>
                </form>
            </Flex>
        </>
    )
}



export const CreateRecipe = () => {
    return (
        <EditComponent data={null} loading={false} />
    )
}

export const EditRecipe = () => {
    const { recipeId } = useParams();
    const { data, loading } = useAuthFetch<RecipeTextResponse>(
        `/api/recipe/edit/${recipeId}`
    );

    return (
        <EditComponent recipeId={recipeId} data={data} loading={loading} />
    )
}