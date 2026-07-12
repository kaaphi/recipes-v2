import { Anchor, Collapse, List, LoadingOverlay, Paper, Stack, Text, Title, Typography, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Marked } from "@ts-stack/markdown";
import { useAuth } from "react-oidc-context";
import { useOutletContext, useParams } from "react-router";
import type { OutletContextType } from "./App";
import { useEffect } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { stubFromRecipe, useAuthFetch, type IngredientList, type Recipe } from "./Recipes";
import { useRecentRecipes } from "./RecentRecipes";
import dayjs from "dayjs";

const Ingredients = ({ list }: { list: IngredientList }) => {
    return (
        <div>{list && <Title order={4}>{list.name}</Title>}
            <List>
                {list.ingredients.map((ingredient, i) => <List.Item key={`ingredient-${i}`}>{ingredient}</List.Item>)}
            </List>
        </div>
    )
}

const SourceLink = ({ text }: { text: string }) => {
    // Regex to check if text starts with http:// or https://
    const isUrl = /^https?:\/\//i.test(text);

    if (isUrl) {
        return (
            <Anchor href={text} target="_blank" rel="noopener noreferrer">
                {text}
            </Anchor>
        );
    }

    return <Text>{text}</Text>;
}

const Sources = ({ sources }: { sources?: string[] }) => {
    const [expanded, { toggle }] = useDisclosure(false);
    if (sources && sources.length > 0) {

        return (
            <Paper shadow="xs" p="xs">
                <UnstyledButton onClick={toggle}>{expanded ? <CaretDownIcon weight="fill" /> : <CaretRightIcon weight="fill" />} Sources</UnstyledButton>
                <Collapse expanded={expanded}>
                    <List>
                        {sources.map((source, idx) => <List.Item key={`source-${idx}`}><SourceLink text={source} /></List.Item>)}
                    </List>
                </Collapse>
            </Paper>
        )
    }
}

const formatDatetime = (date?: Date|null): string => {
    return date ? dayjs(date).format("YYYY-MM-DD") : ""
}

const CreatedLastUpdated = ({ recipe }: { recipe?: Recipe | null }) => {
    const created = recipe?.created_at ? new Date(recipe.created_at) : null
    const updated = recipe?.updated_at ? new Date(recipe.updated_at) : null

    const hasUpdatedTime = updated && updated.getTime() !== created?.getTime()

    const text = hasUpdatedTime ? `Created ${formatDatetime(created)} (Last updated ${formatDatetime(updated)})` : 
                                  `Created ${formatDatetime(created)}`

    return <Text c="dimmed" size="xs" fs="italic" ta="right">{text}</Text>
}

export const RecipeView = () => {
    const auth = useAuth();
    const { recipeId } = useParams();

    const { data, loading } = useAuthFetch<Recipe>(
        `/api/recipe/${recipeId}`
    );
    const { recipeState, setRecipeState } = useOutletContext<OutletContextType>();
    const { addRecentRecipe } = useRecentRecipes()

    useEffect(() => {
        if (data) {
            addRecentRecipe(stubFromRecipe(data))
        }
    }, [data, addRecentRecipe])

    useEffect(() => {
        const isShared = data?.user_id != auth.user?.profile.sub;

        // Only update if the value is actually different to avoid unnecessary loops
        if (recipeState.isSharedRecipe !== isShared) {
            setRecipeState({ ...recipeState, isSharedRecipe: isShared });
        }

        // Dependencies: Run only when these values change
    }, [data?.user_id, auth.user?.profile.sub, recipeState, setRecipeState]);

    return (
        <>
            <LoadingOverlay visible={loading} />
            <Stack>
                <Title order={1}>{data?.title}</Title>
                <Title order={3}>Ingredients</Title>
                {data?.ingredientLists.map((list, i) => <Ingredients key={`ingredients-${i}`} list={list} />)}
                <Title order={3}>Method</Title>
                <Typography>
                    <div dangerouslySetInnerHTML={{ __html: Marked.parse(data?.method || "") }} />
                </Typography>
                <Sources sources={data?.sources} />
                <CreatedLastUpdated recipe={data} />
            </Stack>
        </>
    );
}