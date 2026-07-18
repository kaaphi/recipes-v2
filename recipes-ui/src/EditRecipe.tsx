import { Alert, Button, Divider, Flex, Group, LoadingOverlay, Menu, Modal, rem, Space, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useAuth } from "react-oidc-context";
import { Link, useNavigate, useParams } from "react-router";
import { headerHeight } from "./App";
import { useCallback, useState } from "react";
import { useAuthFetch, type Recipe } from "./Recipes";
import { useHandleError } from "./UtilityHooks";
import { InfoIcon, WarningIcon } from "@phosphor-icons/react";
import { useDisclosure } from "@mantine/hooks";


interface RecipeText {
    title: string
    recipe: string
}

type UseDeleteRecipeReturnValue = {
    deleteRecipe: () => Promise<unknown>,
    saving: boolean,
    error: Error | null,
}

const useDeleteRecipe = (recipeId: string, isPermanent: boolean, onSuccess: () => void): UseDeleteRecipeReturnValue => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const auth = useAuth()

    const deleteRecipe = useCallback((): Promise<unknown> => {
        const url = `/api/recipe/${recipeId}?permanent=${isPermanent}`

        setSaving(true)

        return fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`,
                'Content-Type': 'application/json',
            }
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then(() => {
                setSaving(false)
                onSuccess()
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                return err;
            });
    }, [auth, recipeId, isPermanent, onSuccess])

    return { deleteRecipe, saving: saving, error }
}

export interface UseSaveRecipeReturnValue {
    saveRecipe: (text: string) => Promise<unknown>;
    saving: boolean;
    error: Error | null;
}

const useSaveRecipe = (recipeId?: string): UseSaveRecipeReturnValue => {
    const auth = useAuth()
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const saveRecipe = useCallback((recipeText: string): Promise<unknown> => {
        const url = recipeId ? `/api/recipe/edit/${recipeId}` : "/api/recipe/edit"

        const getRecipeId = (res: unknown): string => {
            if (recipeId) {
                return recipeId
            } else {
                const recipe = res as Recipe
                return recipe.recipe_id
            }
        }

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
                const recipeId = getRecipeId(res)
                setSaving(false)
                navigate(`/recipe/${recipeId}`)
            })
            .catch((err) => {
                setSaving(false);
                setError(err);
                return err;
            });
    }, [auth, recipeId, navigate])

    return { saveRecipe, saving: saving, error }
}

type ConfirmModalParams = {
    opened: boolean,
    close: () => void,
} & ManageRecipeMenuParams

const ConfirmArchiveModal = ({ opened, close, recipeId, recipeTitle }: ConfirmModalParams) => {
    const navigate = useNavigate()
    const { deleteRecipe, saving, error } = useDeleteRecipe(recipeId, false, () => navigate("/"))

    useHandleError(error)

    return <Modal opened={opened} onClose={close} title="Archive Recipe">
        <LoadingOverlay visible={saving} />
        <Stack>
            <Text>Please confirm that you want to archive <Text span fw={700}>{recipeTitle}</Text>.</Text>
            <Alert icon={<InfoIcon />}><Text span fs="italic" fw={500}>Note:</Text> This recipe will not be deleted, but it will no longer be accessible. Viewing archived recipes and unarchiving a recipe are future features.</Alert>
            <Divider />
            <Group justify="flex-end"><Button onClick={deleteRecipe}>Archive Recipe</Button><Button variant="outline" onClick={close}>Cancel</Button></Group>
        </Stack>
    </Modal>
}

const ConfirmDeleteModal = ({ opened, close, recipeId, recipeTitle }: ConfirmModalParams) => {
    const [confirmValue, setConfirmValue] = useState('');
    const navigate = useNavigate()
    const { deleteRecipe, saving, error } = useDeleteRecipe(recipeId, true, () => {
        setConfirmValue("")
        navigate("/")
    })

    useHandleError(error)

    const doClose = () => {
        setConfirmValue("")
        close()
    }

    return <Modal opened={opened} onClose={doClose} title="Delete Recipe">
        <LoadingOverlay visible={saving} />
        <Stack>
            <Text>Please confirm that you want to delete <Text span fw={700}>{recipeTitle}</Text>.</Text>
            <Alert color="yellow" icon={<WarningIcon />}>Deleting a recipe cannot be undone!</Alert>
            <Text>To confirm this deletion, type "confirm".</Text>
            <TextInput placeholder="confirm" value={confirmValue} onChange={(event) => setConfirmValue(event.currentTarget.value)} />
            <Divider />
            <Group justify="flex-end"><Button disabled={confirmValue !== "confirm"} onClick={deleteRecipe}>Delete Recipe</Button><Button variant="outline" onClick={doClose}>Cancel</Button></Group>
        </Stack>
    </Modal>
}


type ManageRecipeMenuParams = {
    recipeId: string,
    recipeTitle: string,
}

const ManageRecipeMenu = ({ recipeId, recipeTitle }: ManageRecipeMenuParams) => {
    const [confirmArchiveOpened, confirmArchiveHandlers] = useDisclosure(false);
    const [confirmDeleteOpened, confirmDeleteHandlers] = useDisclosure(false);

    return <>
        <ConfirmArchiveModal opened={confirmArchiveOpened} close={confirmArchiveHandlers.close} recipeId={recipeId} recipeTitle={recipeTitle} />
        <ConfirmDeleteModal opened={confirmDeleteOpened} close={confirmDeleteHandlers.close} recipeId={recipeId} recipeTitle={recipeTitle} />
        <Menu>
            <Menu.Target>
                <Button variant="subtle">Actions</Button>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Manage Recipe</Menu.Label>
                <Menu.Item onClick={confirmArchiveHandlers.open}>Archive Recipe</Menu.Item>
                <Menu.Item onClick={confirmDeleteHandlers.open}>Delete Recipe</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    </>
}


interface EditComponentParams {
    recipeId?: string;
    data: RecipeText | null;
    loading: boolean;
}


const EditComponent = ({ recipeId, data, loading }: EditComponentParams) => {
    const { saveRecipe, saving, error } = useSaveRecipe(recipeId)

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
                    saveRecipe(recipeText)
                }}>
                    <Stack style={{ height: "100%" }}>
                        <Textarea name="recipe-textarea" defaultValue={data?.recipe} style={{ height: "100%" }} size="md" styles={{
                            // 2. Make the inner wrapper a flex container that grows
                            wrapper: { height: '100%', display: 'flex', flexDirection: 'column' },
                            // 3. Force the native textarea HTML element to fill all available space
                            input: { flexGrow: 1, height: '100%' }
                        }}></Textarea>
                        <Group>
                            <Button type="submit">Save</Button>
                            <Button variant="outline" component={Link} to={recipeId ? `/recipe/${recipeId}` : "/"}>Cancel</Button>
                            {recipeId && data && <><Space style={{ flex: 1 }} /><ManageRecipeMenu recipeId={recipeId} recipeTitle={data?.title} /></>}
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
    const { data, loading } = useAuthFetch<RecipeText>(
        `/api/recipe/edit/${recipeId}`
    );

    return (
        <EditComponent recipeId={recipeId} data={data} loading={loading} />
    )
}