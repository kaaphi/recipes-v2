The plain text recipe format used for editing is as follows:
```abnf
recipe = title
         [ingredient-list-title] ingredient-list
         *(ingredient-list-title ingredient-list)
         CRLF
         method
         CRLF
         [sources]
line = utf8-text CRLF
title = line
ingredient-list-title = utf8-text ":" CRLF
ingredient-list = 1*line
method = *line; interpreted as markdown text
sources = "SOURCES" CRLF *line
utf8-text = *VCHAR; not bothering with a formal UTF8 definition here
newline = CR / CRLF
```