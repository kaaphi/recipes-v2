from app.schemas.api_models import RecipeSearchResult, RecipeSearchMatchType
from app.schemas.dynamodb_models import Recipe

CONTEXT_RADIUS: int = 10
MAX_SCORE_PER_TYPE: float = 2.0
METHOD_WEIGHT: float = 1.0
INGREDIENT_WEIGHT: float = 1.2
TITLE_WEIGHT: float = 3.0


def is_word_ending_character(char: str) -> bool:
    match char:
        case " " | "." | ";" | ":" | ",":
            return True
        case _:
            return False


def search_recipes(
    recipes: list[Recipe], search_string: str
) -> list[RecipeSearchResult]:
    search_string = search_string.lower()
    results = [
        result
        for recipe in recipes
        if (result := create_search_result(recipe, search_string))
    ]
    # sort first by score descending, then by title ascending
    results.sort(key=lambda x: (-x.score, x.title))
    return results


def create_search_result(
    recipe: Recipe, search_string: str
) -> RecipeSearchResult | None:
    max_score: float = 0.0
    total_score: float = 0.0
    final_context = None
    match_type: RecipeSearchMatchType | None = None

    # We search in reverse order of match type preferring type and context for title, then ingredient, and then method.

    score, context = score_string(recipe.method, search_string, limit_context=True)
    if score > 0:
        match_type = RecipeSearchMatchType.method
        final_context = context
    max_score += MAX_SCORE_PER_TYPE * METHOD_WEIGHT
    total_score += score * METHOD_WEIGHT

    for ingredient in [
        ingredient
        for ingredient_list in recipe.ingredientLists
        for ingredient in ingredient_list.ingredients
    ]:
        score, context = score_string(ingredient, search_string, limit_context=False)
        if score > 0:
            match_type = RecipeSearchMatchType.ingredient
            final_context = context
            break
    max_score += MAX_SCORE_PER_TYPE * INGREDIENT_WEIGHT
    total_score += score * INGREDIENT_WEIGHT

    score, context = score_string(recipe.title, search_string, limit_context=False)
    if score > 0:
        match_type = RecipeSearchMatchType.title
        final_context = context
    max_score += MAX_SCORE_PER_TYPE * TITLE_WEIGHT
    total_score += score * TITLE_WEIGHT

    if total_score > 0:
        return RecipeSearchResult(
            title=recipe.title,
            id=recipe.recipe_id,
            match_context=final_context,
            match_type=match_type,
            score=total_score / max_score,
        )
    else:
        return None


def score_string(
    text: str, search_string: str, limit_context: bool = False
) -> tuple[float, str | None]:
    """
    Search the text for the provided search_string and return a score and context.

    Score is 0 for no match, 1 for a match within a word, and 2 for a whole word match.

    Context is None for no match, the whole text if limit_context is False, and a context excerpt from the text if limit_context is True.

    :param text: the text to search in
    :param search_string: the string to search for (must be lowercase)
    :param limit_context: if True, return a limited context for the where we found the string
    :return: tuple of (score, context)
    """
    text = text.strip().replace("\r\n", " ").replace("\n", " ")
    lcase_text = text.lower()

    # First, search for matches. If we find a partial word match, keep searching in case there is a whole word
    # match later. If there are only partial word matches, we use the first one we found.
    i = -1
    match_idx = i
    score = 0
    while (i := lcase_text.find(search_string, i + 1)) >= 0:
        if (i == 0 or lcase_text[i - 1] == " ") and (
            i + len(search_string) == len(lcase_text)
            or is_word_ending_character(lcase_text[i + len(search_string)])
        ):
            match_idx = i
            score = 2
            break
        else:
            if match_idx < 0:
                match_idx = i
            score = 1

    if score == 0:
        context = None
    elif limit_context:
        # When limiting context, we include the CONTEXT_RADIUS characters around the match rounding up to the nearest whole word
        precontext_idx = (
            -1
            if match_idx < CONTEXT_RADIUS
            else lcase_text.rfind(" ", 0, match_idx - CONTEXT_RADIUS)
        )
        if precontext_idx < 0:
            precontext_idx = 0
        else:
            precontext_idx += 1

        postcontext_idx = (
            len(lcase_text)
            if match_idx + len(search_string) + CONTEXT_RADIUS > len(lcase_text)
            else lcase_text.find(" ", match_idx + len(search_string) + CONTEXT_RADIUS)
        )
        if postcontext_idx < 0:
            postcontext_idx = len(lcase_text)

        context = text[precontext_idx:postcontext_idx]
    else:
        context = text

    return score, context
