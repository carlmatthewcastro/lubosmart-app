> Historical record: retained with its original findings and execution results. It is not current acceptance or deployment verification. See the [current documentation index](../../README.md).

# Landing navbar search

Removed the landing header Categories link and moved the existing product search
from the hero into the vacant navbar space. Removed the redundant search icon
on the landing header. Other public headers retain their previous links.
Search keeps its label, 100-character limit, trimmed query and /shop destination.
On narrow screens the search occupies its own row inside the header.

Follow-up: removed the duplicate rectangular input outline shown when clicking
the navbar search. The enclosing rounded field's focus border and shadow remain
visible for keyboard access. The change is scoped to this search input.

Validation: targeted ESLint, TypeScript, Prettier, production build and homepage
feature tests passed (8 tests, 89 assertions). An isolated browser check covers
1920, 1440, 1100, 768 and 320px widths in light/dark mode, full page width and no
horizontal overflow. It also checks that search is in the header, Categories is
absent from landing navigation, no hero search remains, and a trimmed search
submission reaches /shop. Screenshots/results: storage/app/home-reference-match-check.
The existing unresolved category-atlas-v1.png build warning remains. Full keyboard,
screen-reader and zoom review remain incomplete; checks do not establish WCAG compliance.
