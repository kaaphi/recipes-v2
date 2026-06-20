import { Anchor, Button, Group, LoadingOverlay, Stack, Table, Title } from "@mantine/core";
import { scrollToElement, type OutletContextType } from "./App";
import { Link, useOutletContext } from "react-router";
import type { RecipeStub } from "./Recipes";


export const AllRecipes = () => {
    const { userRecipes } = useOutletContext<OutletContextType>();
    const { data, loading } = userRecipes

    const scrollToLetter = (letter: string) => {
        scrollToElement(`letter_${letter}`)
    };

    const grouped = data?.recipes.reduce((acc, r) => {
        const key = r.title.charAt(0).toUpperCase();
        (acc[key] = acc[key] || []).push(r);
        return acc;
    }, {} as Record<string, RecipeStub[]>) || {};


    return (
        <>
            <LoadingOverlay visible={loading || !data} />
            <Stack>
            <Title id="title_top" order={1}>Recipes for {data?.user.display_name}</Title>
            <div>
            <Group>
                {Object.keys(grouped).map((letter) => <Button onClick={() => scrollToLetter(letter)} key={letter} variant="outline" size="xs">{letter}</Button>)}
            </Group>
            </div>
            <Stack>
            {Object.entries(grouped).map(([key, recipes]) =>
                <div key={key}>
                    <Title order={2} style={{ cursor: 'pointer' }} onClick={() => scrollToElement("title_top")} id={"letter_" + key}>{key}</Title>
                    <Table highlightOnHover verticalSpacing="sm">                        
                        <Table.Tbody>
                        {recipes.map((recipe) => 
                        <Table.Tr key={recipe.id}>
                            <Table.Td p={0}>
                                <Anchor p="xs" display="block" component={Link} to={`/recipe/${recipe.id}`}>{recipe.title}</Anchor>
                            </Table.Td>
                        </Table.Tr>
                        )}
                    </Table.Tbody>
                    </Table>
                </div>
            )}
            </Stack>
            </Stack>
        </>
    );
}