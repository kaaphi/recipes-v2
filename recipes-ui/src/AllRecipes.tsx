import { Button, Group, Stack, Title } from "@mantine/core";
import { useFetch, useScrollIntoView } from "@mantine/hooks";
import { useAuth } from "react-oidc-context";
import { scrollToElement } from "./App";

interface RecipeStub {
    title: string,
    id: string,
}
interface UserRecipes {
    user: {
        display_name: string
    },
    recipes: RecipeStub[]
}

export const AllRecipes = () => {
    const auth = useAuth();
    const { data, loading, error, refetch, abort } = useFetch<UserRecipes>(
        "/api/user/recipes",
        {
            headers: {
                "Authorization": `Bearer ${auth.user?.access_token}`
            }
        }
    );


    const scrollToLetter = (letter: string) => {
        scrollToElement(`letter_${letter}`)
    };

    const grouped = data?.recipes.reduce((acc, r) => {
        const key = r.title.charAt(0).toUpperCase();
        (acc[key] = acc[key] || []).push(r.title);
        return acc;
    }, {} as Record<string, string[]>) || {};


    return (
        <>
            <Title order={2}>Recipes for {data?.user.display_name}!</Title>
            <div>
            <Group>
                {Object.keys(grouped).map((letter) => <Button component="a" onClick={() => scrollToLetter(letter)} key={letter} variant="outline" size="xs">{letter}</Button>)}
            </Group>
            {Object.entries(grouped).map(([key, titles]) =>
                <div key={key}>
                    <Title id={"letter_" + key}>{key}</Title>
                    <Stack>
                        {titles.map((title) => <span key={title}>{title}</span>)}
                    </Stack>
                </div>
            )}
            </div>
        </>
    );
}