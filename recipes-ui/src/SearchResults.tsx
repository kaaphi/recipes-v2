import { Anchor, Group, Highlight, LoadingOverlay, Table, Text, Title } from "@mantine/core";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useSearchRecipes, type RecipeSearchResult } from "./Recipes";
import { useEffect } from "react";

type ResultParams = {
    result: RecipeSearchResult;
    query: string;
}

const Result = ({ result, query }: ResultParams) => {
    switch (result.match_type) {
        case "title":
            return (
                <Anchor p="xs" display="block" component={Link} to={`/recipe/${result.id}`}><Highlight
                    highlight={query}
                    highlightStyles={{ fontWeight: 'bold', background: 'transparent', color: 'inherit' }}
                >{result.title}</Highlight></Anchor>
            )

        case "ingredient":
            return (
                <Group>
                    <Anchor p="xs" display="block" component={Link} to={`/recipe/${result.id}`}>{result.title}</Anchor>
                    <Text size="sm" fs="italic">(ingredient: <Highlight
                        span
                        highlight={query}
                        highlightStyles={{ fontWeight: 'bold', background: 'transparent', color: 'inherit' }}
                    >{result.match_context}</Highlight>
                        )</Text>
                </Group>
            )

        case "method":
            return (
                <Group>
                    <Anchor p="xs" display="block" component={Link} to={`/recipe/${result.id}`}>{result.title}</Anchor>
                    <Text size="sm" fs="italic">(<Highlight
                        span
                        highlight={query}
                        highlightStyles={{ fontWeight: 'bold', background: 'transparent', color: 'inherit' }}
                    >{result.match_context}</Highlight>
                        )</Text>
                </Group>
            )
    }

}

export const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const rawQuery = searchParams.get("q")
    const query = rawQuery ? rawQuery : ""
    const navigate = useNavigate();
    const { data, loading } = useSearchRecipes(query)

    const shouldRedirectToRecipe = data && data.length == 1 && data[0].match_type === "title"

    useEffect(() => {
        if (shouldRedirectToRecipe) {
            navigate(`/recipe/${data[0].id}`)
        }
    }, [shouldRedirectToRecipe, navigate, data])
    
    if (shouldRedirectToRecipe) {
        return <LoadingOverlay visible={true} />;
    } else {
        return (
            <>
                <LoadingOverlay visible={loading} />
                <Title order={3}>&ldquo;{query}&rdquo;</Title>

                <Table highlightOnHover verticalSpacing="sm">
                    <Table.Tbody>
                        {data?.map((result) =>
                            <Table.Tr key={result.id}>
                                <Table.Td p={0}>
                                    <Result result={result} query={query} />
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </>
        )
    }
}