# SQL-to-Canvas Parser Resilience Review

## Scope and method

Read-only review of the SQL-to-Canvas parser and SQL generator. The requested
`parseSqlToState.ts` is not present; its role is performed by
`client/src/utils/sqlToCanvas.ts`. SQL snippets were parsed locally with
`node-sql-parser`; no SQL was executed against a database.

## Edge-case matrix

| Edge Case Scenario | Test SQL Snippet | Expected Parser/UI Behavior | Resilience Assessment |
|---|---|---|---|
| Window frame clause | `SELECT SUM(population) OVER (PARTITION BY countrycode ORDER BY population ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rolling FROM public.city;` | The parser accepts the SQL. The mapper retains partition and order expressions but not `window_frame_clause`; applying to canvas succeeds, while regenerated SQL omits the frame. | **Medium — silent semantic loss.** Results can differ because PostgreSQL applies its default frame. Parser mapping: `client/src/utils/sqlToCanvas.ts:238-264`; window generation: `client/src/utils/queryBuilder.ts:514-535`; UI catch: `client/src/routes/QueryPage.tsx:269-304`. |
| CTE shadows schema-qualified table | `WITH city AS (SELECT name FROM public.country) SELECT name FROM public.city;` | The parser accepts the SQL. CTE resolution compares table names without respecting the source schema, so `public.city` may map to the CTE `city`; canvas regeneration can silently use the CTE instead of the base table. | **High — incorrect source resolution.** No mapping error is raised. See `client/src/utils/sqlToCanvas.ts:284-305,336-343` and `client/src/utils/queryBuilder.ts:1042-1051`. |
| Nested CTE references | `WITH first_cte AS (SELECT countrycode, name FROM public.city), second_cte AS (SELECT countrycode FROM first_cte) SELECT countrycode FROM second_cte;` | Parsing succeeds and nested CTE queries are mapped recursively. The nested mapper does not receive prior CTEs as known tables, so `first_cte` can lack database-column metadata in the canvas. The ordered generated CTE SQL may still preserve the reference. | **Medium — degraded canvas mapping.** No error is necessarily shown. See `client/src/utils/sqlToCanvas.ts:278-305,410-425` and `client/src/utils/queryBuilder.ts:1148-1160`. |
| Unquoted reserved alias | `SELECT name AS CHECK FROM public.city;` | Parsing and mapping succeed. The generator quotes aliases that are reserved according to its loaded PostgreSQL keyword list. | **Low — handled when keyword metadata is available.** Verify behavior if the keyword list is absent or stale. See `client/src/utils/sqlToCanvas.ts:172-174,220-235`; `client/src/utils/queryBuilder.ts:33-54,200-202`; keyword retrieval: `server/src/queries.js:76`, `server/src/routes/database.js:80-88`. |
| CTE with an empty target list | `WITH empty AS (SELECT FROM public.city) SELECT * FROM empty;` | The installed parser rejects this PostgreSQL form before mapping. The apply-to-canvas handler catches parser errors and displays an error alert. | **Low — graceful rejection.** No partial mapping is produced. See `client/src/routes/QueryPage.tsx:269-304,1072-1075`. |
| OR condition across columns | `SELECT name FROM public.city WHERE countrycode = 'USA' OR population > 1000000;` | Parsing succeeds, but the mapper stores conditions per column and does not preserve the original boolean expression tree. The generator can combine the separate conditions with `AND`; the UI still reports successful application. | **High — silent semantic change.** See `client/src/utils/sqlToCanvas.ts:134-160` and `client/src/utils/queryBuilder.ts:445-497`. |

## Findings summary

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `client/src/utils/sqlToCanvas.ts` | 284-305, 336-343 | Schema-insensitive CTE name resolution can map a schema-qualified base table reference to a same-named CTE. | 8/10 |
| 2 | 🟠 HIGH | `client/src/utils/sqlToCanvas.ts`; `client/src/utils/queryBuilder.ts` | 134-160; 445-497 | Mapping conditions by column can discard cross-column `OR` grouping and regenerate a different predicate. | 9/10 |
| 3 | 🟡 MEDIUM | `client/src/utils/sqlToCanvas.ts`; `client/src/utils/queryBuilder.ts` | 238-264; 514-535 | Window frame clauses are not preserved when SQL is mapped to the canvas and regenerated. | 9/10 |
| 4 | 🟡 MEDIUM | `client/src/utils/sqlToCanvas.ts` | 278-305, 410-425 | Nested CTE references are not passed as known CTE metadata to recursive mapping, which can degrade canvas table/column metadata. | 8/10 |
| 5 | ⚪ LOW | `client/src/utils/queryBuilder.ts` | 33-54, 200-202 | Reserved aliases rely on the client’s PostgreSQL keyword metadata being present and current; this case is handled when it is available. | 7/10 |
| 6 | ⚪ LOW | `client/src/routes/QueryPage.tsx` | 269-304, 1072-1075 | The tested empty-target-list CTE SQL is rejected by the parser and surfaced through the UI error path; no failure was observed for this case. | 9/10 |

## Boundaries and limitations

The parser has a useful failure boundary for syntax or mapping errors: exceptions
from parsing and canvas mapping are caught and shown as an apply-to-canvas error.
That boundary does not detect semantic information lost during a successful
mapping. In particular, CTE name shadowing, cross-column boolean grouping, and
window frames can be altered without an exception. Existing validation
(`client/src/validation/testQueries.ts`) exercises standard query patterns but
does not cover the edge cases above.

For Chapter 5.4, the parser should be described as a best-effort SQL-to-Canvas
translator for supported query constructs, not a semantics-preserving
round-trip parser for arbitrary PostgreSQL SQL. Unsupported syntax may be
rejected with a UI error; currently, some supported-by-parser constructs that
the canvas model cannot represent can instead be silently simplified. A safer
boundary is to reject unsupported AST nodes explicitly and to verify regenerated
SQL semantics for CTE resolution, boolean predicates, and window clauses.
