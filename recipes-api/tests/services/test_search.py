import pytest
from app.services.search import score_string

title = "This is a title"
method = """This is
the method where the chicken and pasta
can be found, and where this line ends
"""

search_test_data = [
    (title, "is", False, 2, title),
    (title, "title", False, 2, title),
    (title, "his", False, 1, title),
    (title, "this", False, 2, title),
    (title, title.lower(), False, 2, title),
    (title, "muffin", False, 0, None),
    (method, "chicken", True, 2, "where the chicken and pasta"),
    (method, "chick", True, 1, "where the chicken and pasta"),
    (method, "found", True, 2, "pasta can be found, and where"),
    (method, "and", True, 2, "the chicken and pasta can"),
    (method, "ends", True, 2, "this line ends"),
    (method, "line", True, 2, "where this line ends"),
    (method, "this", True, 2, "This is the method"),
    (method, "is", True, 2, "This is the method"),
    (method, "muffin", True, 0, None),
]


@pytest.mark.parametrize(
    "text,search_string,limit_context,expected_score,expected_context", search_test_data
)
def test_score_string(
    text: str,
    search_string: str,
    limit_context: bool,
    expected_score: float,
    expected_context: str,
):
    score, context = score_string(text, search_string, limit_context)

    assert score == expected_score
    assert context == expected_context
