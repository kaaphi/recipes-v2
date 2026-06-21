import { Anchor, Collapse, List, LoadingOverlay, Paper, Stack, Text, Title, Typography, UnstyledButton } from "@mantine/core";
import { useDisclosure, useFetch } from "@mantine/hooks";
import { Marked } from "@ts-stack/markdown";
import { useAuth } from "react-oidc-context";
import { useOutletContext, useParams } from "react-router";
import { handleError } from "./main";
import type { OutletContextType } from "./App";
import { useEffect } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

export interface IngredientList {
    name?: string,
    ingredients: string[]
}

export interface Recipe {
    title: string,
    recipe_id: string,
    user_id: string
    method: string,
    sources: string[],
    ingredientLists: IngredientList[]
}

const Ingredients = ({list} : {list: IngredientList}) => {
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

const Sources = ({sources} : {sources?: string[]}) => {
    if (sources && sources.length > 0) {
        const [expanded, { toggle }] = useDisclosure(false);

        return (
            <Paper shadow="xs" p="xs">
            <UnstyledButton onClick={toggle}>{expanded ? <CaretDownIcon weight="fill"/> : <CaretRightIcon weight="fill"/>} Sources</UnstyledButton>
            <Collapse expanded={expanded}>
            <List>
            {sources.map((source, idx) => <List.Item key={`source-${idx}`}><SourceLink text={source}/></List.Item>)}
            </List>
            </Collapse>
            </Paper>
        )
    }
}

export const Recipe = () => {
    const auth = useAuth();
    const { recipeId } = useParams();
    const { data, loading, error } = useFetch<Recipe>(
        `/api/recipe/${recipeId}`,
        {
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            }
        }
    );
    const {recipeState, setRecipeState} = useOutletContext<OutletContextType>();

    useEffect(() => {
        const isShared = data?.user_id != auth.user?.profile.sub;

        // Only update if the value is actually different to avoid unnecessary loops
        if (recipeState.isSharedRecipe !== isShared) {
            setRecipeState({ ...recipeState, isSharedRecipe: isShared });
        }

        // Dependencies: Run only when these values change
    }, [data?.user_id, auth.user?.profile.sub, recipeState.isSharedRecipe]); 


    handleError(error)


    return (
        <>
            <LoadingOverlay visible={loading} />
            <Stack>
            <Title order={1}>{data?.title}</Title>
            <Title order={3}>Ingredients</Title>
            {data?.ingredientLists.map((list, i) => <Ingredients key={`ingredients-${i}`} list={list} />)}
            <Title order={3 }>Method</Title>
            <Typography>
            <div dangerouslySetInnerHTML={{__html: Marked.parse(data?.method || "")}} />
            </Typography>
            <Sources sources={data?.sources} />
            </Stack>
        </>
    );
}