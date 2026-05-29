from collections.abc import Generator
from typing import Callable

from schemas.api_models import PlainTextRecipe
from schemas.dynamodb_models import IngredientList, Recipe

SOURCES_TAG = "SOURCES"


def is_empty_line(x: str):
    return x.strip() == ""


def line_equals(*values: str) -> Callable[[str], bool]:
    return lambda x: x.strip() in values


class PlainTextParser:
    def __init__(self, text: str):
        self._lines_iter = iter(str.splitlines(text))
        self._advance()

    def _advance(self) -> str|None:
        self._next_line = next(self._lines_iter, None)
        if self._next_line is not None:
            self._next_line = self._next_line.strip()


    def _peek_next(self, skip_empty_lines=False):
        while skip_empty_lines and self._next_line == "":
            self._advance()
        return self._next_line

    def _lines(
        self, skip_empty_lines=False, until: Callable[[str], bool] = is_empty_line
    ) -> Generator[str, None, None]:
        if skip_empty_lines:
            self._peek_next(skip_empty_lines)

        while self._next_line is not None and not until(self._next_line):
            out = self._next_line
            self._advance()
            yield out

    def parse(self) -> PlainTextRecipe:
        title = next(self._lines(skip_empty_lines=True))

        if not title:
            raise Exception("Missing title!")

        ingredient_lists = list(self._parse_ingredients())

        method = "\n".join(
            self._lines(skip_empty_lines=True, until=line_equals(SOURCES_TAG))
        ).rstrip()

        if self._peek_next(skip_empty_lines=True) == SOURCES_TAG:
            # skip the SOURCES line
            next(self._lines())
            sources = list(self._lines())
        else:
            sources = []

        return PlainTextRecipe(
            title=title,
            method=method,
            sources=sources,
            ingredientLists=ingredient_lists,
        )

    def _parse_ingredients(self) -> Generator[IngredientList, None, None]:
        is_default = True

        while True:
            first = self._peek_next(skip_empty_lines=True)
            name = None
            if not first:
                break
            if first.endswith(":"):
                name = next(self._lines())[:-1]
            elif not is_default:
                break

            ingredients = list(self._lines(skip_empty_lines=True))
            yield IngredientList(name=name, ingredients=ingredients)
            is_default = False


def parse_plain_text(text: str) -> PlainTextRecipe:
    return PlainTextParser(text).parse()


def to_plain_text(recipe: PlainTextRecipe|Recipe) -> str:
    out = [recipe.title]
    for ingredient_list in recipe.ingredientLists:
        out.append("")
        if ingredient_list.name:
            out.append(f"{ingredient_list.name}:")
        for ingredient in ingredient_list.ingredients:
            out.append(ingredient)
    out.append("")
    out.append(recipe.method)
    if recipe.sources:
        out.append("")
        out.append(SOURCES_TAG)
        for source in recipe.sources:
            out.append(source)

    return "\n".join(out)
