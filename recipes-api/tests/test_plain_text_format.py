import pytest

from schemas.api_models import PlainTextRecipe
from schemas.dynamodb_models import IngredientList
from schemas.plain_text_format import from_plain_text, to_plain_text

valid_test_data = [
    (
        """Title Only
""",
        PlainTextRecipe(title="Title Only", method=""),
    ),
    (
        """Title and Ingredients Only

first ingredient
second ingredient
""",
        PlainTextRecipe(
            title="Title and Ingredients Only",
            method="",
            ingredientLists=[
                IngredientList(ingredients=["first ingredient", "second ingredient"])
            ],
        ),
    ),
    (
        """Minimal Complete Recipe no sources

first ingredient
second ingredient

simple
method
""",
        PlainTextRecipe(
            title="Minimal Complete Recipe no sources",
            method="simple\nmethod",
            ingredientLists=[
                IngredientList(ingredients=["first ingredient", "second ingredient"])
            ],
        ),
    ),
    (
        """Minimal Complete Recipe

first ingredient
second ingredient

simple
method

SOURCES
bob
george
""",
        PlainTextRecipe(
            title="Minimal Complete Recipe",
            method="simple\nmethod",
            ingredientLists=[
                IngredientList(ingredients=["first ingredient", "second ingredient"])
            ],
            sources=["bob", "george"],
        ),
    ),
    (
        """Empty lines in method

ingredient

method

with
empty

lines


""",
        PlainTextRecipe(
            title="Empty lines in method",
            method="method\n\nwith\nempty\n\nlines",
            ingredientLists=[IngredientList(ingredients=["ingredient"])],
        ),
    ),
    (
        """Named default ingredient list

my name:
first ingredient
second ingredient

method
""",
        PlainTextRecipe(
            title="Named default ingredient list",
            method="method",
            ingredientLists=[
                IngredientList(
                    name="my name",
                    ingredients=["first ingredient", "second ingredient"],
                )
            ],
        ),
    ),
    (
        """Named ingredient list

first ingredient
second ingredient

more:
additional ingredient

method
""",
        PlainTextRecipe(
            title="Named ingredient list",
            method="method",
            ingredientLists=[
                IngredientList(ingredients=["first ingredient", "second ingredient"]),
                IngredientList(name="more", ingredients=["additional ingredient"]),
            ],
        ),
    ),
]


@pytest.mark.parametrize("text,expected_recipe", valid_test_data)
def test_plain_text_format(text: str, expected_recipe: PlainTextRecipe) -> None:
    actual = from_plain_text(text)
    assert actual == expected_recipe
    assert from_plain_text(to_plain_text(actual)) == expected_recipe


invalid_test_data = [
    "",
    """



""",
]


@pytest.mark.parametrize("text", invalid_test_data)
def test_plain_text_format_invalid(text: str) -> None:
    with pytest.raises(Exception):
        from_plain_text(text=text)
