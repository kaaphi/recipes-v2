import { Alert, Button, Divider, Flex, Group, LoadingOverlay, Menu, Modal, rem, Space, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { Link, useNavigate, useParams } from "react-router";
import { headerHeight } from "./App";
import { useCallback, useState } from "react";
import { type RecipeTextRequest, useAuthFetch, useUserRecipes, type Recipe, type RecipeTextResponse, type RecipeUpdate } from "./Recipes";
import { useHandleError } from "./UtilityHooks";
import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { useDisclosure } from "@mantine/hooks";

type UseModifyRecipeReturnValue = {
    modifyRecipe: (body?: unknown) => Promise<unknown>,
    saving: boolean,
    error: Error | null,
}

type UseModifyRecipeOnSuccessReturnValue = {
    onSuccessAction: () => void,
    refreshRecipes: boolean,
}

const useModifyRecipe = (method: string, url: string, onSuccess?: (res: unknown) => UseModifyRecipeOnSuccessReturnValue, responseParser?: (res: Response) => Promise<unknown>, fetchParams?: RequestInit): UseModifyRecipeReturnValue => {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const { refetch: refreshRecipes } = useUserRecipes()

    const modifyRecipe = useCallback((body?: unknown): Promise<unknown> => {
        setSaving(true)

        const headers: HeadersInit = {}

        const params: RequestInit = {
            ...fetchParams,
            headers: headers,
            method: method
        }

        if (body) {
            headers["Content-Type"] = "application/json"
            params.body = JSON.stringify(body)
        }

        return fetch(url, params)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`)
                }
                if (responseParser) {
                    return responseParser(res)
                } else {
                    return res
                }
            })
            .then((res) => {
                if (!onSuccess) {
                    setSaving(false)
                    return
                } else {
                    const onSuccessResult = onSuccess(res)
                    if(onSuccessResult.refreshRecipes) {
                        refreshRecipes()
                        setSaving(false)
                    }
                    onSuccessResult.onSuccessAction()
                }
                
                if (onSuccess) {
                    return onSuccess(res)
                }
            })
            .catch((err) => {
                setSaving(false)
                setError(err)
                return err
            });
    }, [method, url, fetchParams, onSuccess, refreshRecipes, responseParser])

    return { modifyRecipe, saving: saving, error }

}

type ConfirmModalParams = {
    opened: boolean,
    close: () => void,
} & ManageRecipeMenuParams

const ConfirmArchiveUnarchiveModal = ({ opened, close, recipeId, recipe }: ConfirmModalParams) => {
    const navigate = useNavigate()
    const onSuccess = useCallback((_: unknown): UseModifyRecipeOnSuccessReturnValue => {
        return {
            refreshRecipes: true,
            onSuccessAction: () => {
                if (recipe.is_archived) {
                    navigate(`/recipe/${recipeId}`)
                } else {
                    navigate("/")
                }
            }
        }
    }, [navigate, recipe.is_archived, recipeId])
    const { modifyRecipe, saving, error } = useModifyRecipe("PUT", `/api/recipe/${recipeId}`, onSuccess)
    const archiveBody: RecipeUpdate = {
        is_archived: !recipe.is_archived
    }

    useHandleError(error)

    return <Modal opened={opened} onClose={close} title={recipe.is_archived ? "Unarchive Recipe" : "Archive Recipe"}>
        <LoadingOverlay visible={saving} />
        <Stack>
            <Text>Please confirm that you want to {recipe.is_archived ? "unarchive" : "archive"} <Text span fw={700}>{recipe.title}</Text>.</Text>
            <Divider />
            <Group justify="flex-end"><Button onClick={() => modifyRecipe(archiveBody)}>{recipe.is_archived ? "Unarchive" : "Archive"} Recipe</Button><Button variant="outline" onClick={close}>Cancel</Button></Group>
        </Stack>
    </Modal>
}

const ConfirmDeleteModal = ({ opened, close, recipeId, recipe }: ConfirmModalParams) => {
    const [confirmValue, setConfirmValue] = useState('');
    const navigate = useNavigate()
    const onSuccess = useCallback((_: unknown): UseModifyRecipeOnSuccessReturnValue => {
        return {
            refreshRecipes: true,
            onSuccessAction: () => {
                setConfirmValue("")
                navigate("/")
            }
        }
    }, [navigate, setConfirmValue])

    const { modifyRecipe, saving, error } = useModifyRecipe("DELETE", `/api/recipe/${recipeId}?is_archived=${recipe.is_archived}`, onSuccess)

    useHandleError(error)

    const doClose = () => {
        setConfirmValue("")
        close()
    }

    return <Modal opened={opened} onClose={doClose} title="Delete Recipe">
        <LoadingOverlay visible={saving} />
        <Stack>
            <Text>Please confirm that you want to delete <Text span fw={700}>{recipe.title}</Text>.</Text>
            <Alert color="yellow" icon={<WarningIcon />}>Deleting a recipe cannot be undone!</Alert>
            <Text>To confirm this deletion, type "confirm".</Text>
            <TextInput placeholder="confirm" value={confirmValue} onChange={(event) => setConfirmValue(event.currentTarget.value)} />
            <Divider />
            <Group justify="flex-end"><Button disabled={confirmValue !== "confirm"} onClick={() => modifyRecipe()}>Delete Recipe</Button><Button variant="outline" onClick={doClose}>Cancel</Button></Group>
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
    const navigate = useNavigate()

    const method = recipeId ? "PUT" : "POST"
    const url = recipeId ? `/api/recipe/edit/${recipeId}` : "/api/recipe/edit"
    const handleSuccess = useCallback((res: unknown): UseModifyRecipeOnSuccessReturnValue => {
        return {
            refreshRecipes: !recipeId,
            onSuccessAction: () => {
                const resultRecipeId = recipeId || (res as Recipe).recipe_id
                navigate(`/recipe/${resultRecipeId}`)
            }
        }
    }, [navigate, recipeId]);

    const { modifyRecipe, saving, error } = useModifyRecipe(method, url, handleSuccess, (res) => res.json())

    useHandleError(error)

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
                    const recipeTextRequest: RecipeTextRequest = { recipe: recipeText }
                    modifyRecipe(recipeTextRequest)
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