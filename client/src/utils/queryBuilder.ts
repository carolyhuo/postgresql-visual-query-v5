/**
 * PostgreSQL Query Builder Utility
 *
 * This module provides a comprehensive set of utilities for building PostgreSQL queries
 * using the squel query builder. It handles various SQL operations including:
 * - SELECT queries with complex joins
 * - INSERT operations
 * - UPDATE operations
 * - DELETE operations
 * - Set operations (UNION, INTERSECT, EXCEPT)
 * - Column and table aliasing
 * - Filtering and conditions
 * - Ordering and grouping
 *
 * The module is designed to work with a visual query builder interface, allowing
 * users to construct complex SQL queries through a graphical interface.
 */

import * as _ from 'lodash';
import squel, { JoinMixin } from 'squel';
import { QueryColumnType, JoinType, QueryTableType, QueryType } from '../types/queryTypes';
import { ReservedKeywordType } from '../types/hostTypes';

/**
 * Determines if a SQL identifier needs quoting and returns the properly quoted version if necessary.
 * Quotes are added only when:
 * 1. The identifier contains spaces
 * 2. The identifier contains special characters
 * 3. The identifier is a PostgreSQL reserved keyword
 * @param identifier The SQL identifier to potentially quote
 * @returns The identifier, quoted if necessary
 */
const quoteIdentifier = (identifier: string): string => {
  if (!identifier) return identifier;

  // If already quoted, return as is
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }

  const reservedKeywordsArray = JSON.parse(sessionStorage.getItem('psql_reserved_keywords') || '[]');
  const reservedKeywords = new Set(
    reservedKeywordsArray.map((keyword: ReservedKeywordType) => keyword.word.toLowerCase()),
  );

  // Check if it's a reserved word (case insensitive)
  if (reservedKeywords.has(identifier.toLowerCase())) {
    return `"${identifier}"`;
  }

  // Check if it contains spaces or special characters
  const needsQuoting = /[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^`{|}~]/.test(identifier);

  return needsQuoting ? `"${identifier}"` : identifier;
};

/**
 * Initialize PostgreSQL flavor of squel query builder
 */
const squelPostgres = squel.useFlavour('postgres');

/**
 * Adds ORDER BY clauses to a query based on column configuration
 * Handles complex cases including:
 * - Ordering by aliases
 * - Ordering by aggregate functions
 * - Ordering by expressions
 * - NULLS FIRST/NULLS LAST positioning
 * @param column The column configuration containing ordering information
 * @param query The squel query object to modify
 */
const addOrder = (column: QueryColumnType, query: squel.PostgresSelect) => {
  // Helper function to check if a string is an expression (contains operators)
  const isExpression = (str: string) => {
    // Check for common SQL operators
    const operators = ['||', '+', '-', '*', '/', 'AND', 'OR', 'IN', 'LIKE', 'IS', 'NOT', 'NULL'];
    return operators.some((op) => str.includes(op));
  };

  // Helper function to add nulls position to order by clause
  const addOrderWithNullsPosition = (field: string, direction: boolean) => {
    const orderClause = `${field} ${direction ? 'ASC' : 'DESC'}${column.column_nulls_position ? ` NULLS ${column.column_nulls_position}` : ''}`;
    query.order(orderClause, null, { dontQuote: true });
  };

  // If we have an alias, use it directly for aggregate and single-line functions
  if (
    column.column_alias.length > 0 &&
    (column.column_aggregate.length > 0 || column.column_single_line_function.length > 0)
  ) {
    addOrderWithNullsPosition(quoteIdentifier(column.column_alias), column.column_order_dir);
    return;
  }

  // 1) Handle aggregates without alias
  if (column.column_aggregate && column.column_aggregate.length > 0) {
    const tableOrAlias = column.table_alias || column.table_name;
    const aggField = `${column.column_aggregate}(${quoteIdentifier(tableOrAlias)}.${quoteIdentifier(column.column_name)})`;
    addOrderWithNullsPosition(aggField, column.column_order_dir);
    return;
  }

  // 2) Handle single-line functions without alias
  if (column.column_single_line_function && column.column_single_line_function.length > 0) {
    const tableOrAlias = _.isEmpty(column.table_alias) ? column.table_name : column.table_alias;

    // Check if column_name is an expression
    if (isExpression(column.column_name)) {
      // For expressions, don't use quoteIdentifier on the column part and don't prepend table name
      const wrappedField = `${column.column_single_line_function}(${column.column_name})`;
      addOrderWithNullsPosition(wrappedField, column.column_order_dir);
    } else {
      // For regular column names, use quoteIdentifier
      const baseExpression = `${quoteIdentifier(tableOrAlias)}.${quoteIdentifier(column.column_name)}`;
      const wrappedField = `${column.column_single_line_function}(${baseExpression})`;
      addOrderWithNullsPosition(wrappedField, column.column_order_dir);
    }
    return;
  }

  // 3) No aggregate, no single-line function → fallback to alias or table.column
  if (_.isEmpty(column.column_alias)) {
    // Check if column_name is an expression
    if (isExpression(column.column_name)) {
      // For expressions, don't prepend table name
      addOrderWithNullsPosition(column.column_name, column.column_order_dir);
    } else {
      // Use table alias if present, else table_name
      const tableOrAlias = _.isEmpty(column.table_alias) ? column.table_name : column.table_alias;
      // For regular column names, use quoteIdentifier
      const orderColumn = `${quoteIdentifier(tableOrAlias)}.${quoteIdentifier(column.column_name)}`;
      addOrderWithNullsPosition(orderColumn, column.column_order_dir);
    }
  } else {
    addOrderWithNullsPosition(quoteIdentifier(column.column_alias), column.column_order_dir);
  }
};

/**
 * Replaces column names in an expression with their fully qualified versions
 * @param expression The expression containing column names
 * @param tables Array of tables with their columns
 * @returns The expression with qualified column names
 */
const replaceColumnNamesWithQualified = (expression: string, tables: QueryTableType[]) => {
  // Get all column names from all tables in the query
  const allColumns = tables.flatMap((table) =>
    table.columns.map((col) => ({
      name: col.column_name,
      table: table.table_name,
      tableAlias: table.table_alias,
    })),
  );

  // Create a regex pattern that matches any column name
  const columnPattern = new RegExp(`\\b(${allColumns.map((c) => c.name).join('|')})\\b`, 'gi');

  // Replace any column name with its qualified version
  return expression.replace(columnPattern, (match) => {
    // Find the table for this column
    const columnInfo = allColumns.find((c) => c.name.toLowerCase() === match.toLowerCase());
    if (columnInfo) {
      // Use table alias if available, otherwise use table name
      const tableRef = columnInfo.tableAlias || columnInfo.table;
      return `${quoteIdentifier(tableRef)}.${quoteIdentifier(match)}`;
    }
    return match;
  });
};

/**
 * Adds columns, aggregates, and functions to a SELECT query
 * Handles:
 * - Regular columns
 * - Aliased columns
 * - Aggregate functions
 * - Scalar functions
 * - DISTINCT ON clauses
 * - GROUP BY clauses for aggregates
 * - Special '*' column to select all columns from a table
 * @param data The query configuration object
 * @param query The squel query object to modify
 * @param queries Array of all queries (for subquery support)
 * @param isSetQuery Whether this query is part of a set operation
 */
const addColumnsToQuery = (
  data: QueryType,
  query: squel.PostgresSelect,
  queries: QueryType[],
  isSetQuery?: boolean,
) => {
  const columns = _.cloneDeep(data.columns);

  const addFieldWithAlias = (table: string, column: string, alias: string) => {
    query.field(`${quoteIdentifier(table)}.${quoteIdentifier(column)}`, quoteIdentifier(alias));
  };

  const matchesIgnoreCase = (str: string, startIndex: number, pattern: string) =>
    str.slice(startIndex, startIndex + pattern.length).toUpperCase() === pattern.toUpperCase();

  /**
   * 2) tokenizeConditionString
   *    - Reads a condition string like "= 'test' OR = 'test2'"
   *    - Ignores OR/AND inside quotes
   *    - Produces a token list, e.g.:
   *      [
   *        { type: 'TEXT', value: "= 'test'" },
   *        { type: 'OPERATOR', value: 'OR' },
   *        { type: 'TEXT', value: "= 'lala'" }
   *      ]
   */
  const tokenizeConditionString = (condition: string) => {
    const str = condition.replace(/"/g, "'"); // Replace double quotes with single quotes
    const tokens = [];

    let insideQuotes = false;
    let insideParens = 0; // Track nested parentheses
    let current = '';
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      // Toggle quote state if we see a single quote
      if (char === "'") {
        insideQuotes = !insideQuotes;
        current += char;
        i += 1;
        continue;
      }

      // Track parentheses depth
      if (char === '(') {
        insideParens++;
        current += char;
        i += 1;
        continue;
      }
      if (char === ')') {
        insideParens--;
        current += char;
        i += 1;
        continue;
      }

      // Only check for operators if we're not inside quotes or parentheses
      if (!insideQuotes && insideParens === 0) {
        // Check "OR"
        if (matchesIgnoreCase(str, i, 'OR')) {
          // If we have accumulated some text, push it as TEXT
          if (current.trim().length > 0) {
            tokens.push({ type: 'TEXT', value: current.trim() });
          }
          current = ''; // reset

          // Push operator
          tokens.push({ type: 'OPERATOR', value: 'OR' });

          i += 2; // skip "OR"
          // Skip spaces
          while (i < str.length && /\s/.test(str[i])) {
            i += 1;
          }
          continue;
        }

        // Check "AND"
        if (matchesIgnoreCase(str, i, 'AND')) {
          // If we have accumulated some text, push it
          if (current.trim().length > 0) {
            tokens.push({ type: 'TEXT', value: current.trim() });
          }
          current = ''; // reset

          // Push operator
          tokens.push({ type: 'OPERATOR', value: 'AND' });

          i += 3; // skip "AND"
          // Skip spaces
          while (i < str.length && /\s/.test(str[i])) {
            i += 1;
          }
          continue;
        }
      }

      // Default case: add char to current
      current += char;
      i += 1;
    }

    // End of string: push whatever remains as TEXT
    if (current.trim().length > 0) {
      tokens.push({ type: 'TEXT', value: current.trim() });
    }

    return tokens;
  };

  /**
   * 3) buildConditionString
   *    - Takes tokens from tokenizeConditionString
   *    - For each TEXT token, ensures "columnName = something"
   *      if there's an '=' present (with optional spaces).
   *    - Joins OPERATOR tokens ("OR"/"AND") in between.
   */
  const buildConditionString = (
    tokens: { type: string; value: string }[],
    columnName: string,
    queries: QueryType[],
  ) => {
    let result = '';
    let hasOperator = false; // track if we've seen an OR/AND

    // If columnName is just a dot (.), treat it as empty
    const effectiveColumnName = columnName === '.' ? '' : columnName;

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];

      if (token.type === 'TEXT') {
        const textVal = token.value.trim();

        // Check for query references like {Query Name}
        const queryRefRegex = /\{([^{}]+)\}/g;
        let modifiedText = textVal;
        let foundQueryRef = false;

        // Process any query references in the text value
        modifiedText = textVal.replace(queryRefRegex, (match, queryName) => {
          foundQueryRef = true;

          // Find the referenced query (case insensitive)
          const referencedQuery = queries.find((q) => q.queryName.toLowerCase() === queryName.trim().toLowerCase());

          if (referencedQuery) {
            // Build the referenced query (removing trailing semicolon)
            const subquerySql = buildQuery({ data: referencedQuery, queries }).slice(0, -1);
            // Don't add extra parentheses if the subquery already has them
            return subquerySql.startsWith('(') && subquerySql.endsWith(')') ? subquerySql : `(${subquerySql})`;
          }

          // If query not found, keep the original reference
          return match;
        });

        // If no query references were found, process as normal
        if (!foundQueryRef) {
          // Special handling for subqueries (starting with IN, EXISTS, etc.)
          const subqueryMatch = textVal.match(/^(IN|EXISTS|NOT\s+EXISTS|NOT\s+IN)\s*(\(SELECT[\s\S]*\))/i);
          if (subqueryMatch) {
            const [, operator, subquery] = subqueryMatch;
            result += effectiveColumnName
              ? `${effectiveColumnName} ${operator} ${subquery}`
              : `${operator} ${subquery}`;
          } else {
            // Check for other operators at the start
            const operatorMatch = textVal.match(/^(=|LIKE|>|<|>=|<=|<>|!=)\s*(.*)/i);
            if (operatorMatch) {
              const [, operator, rightSide] = operatorMatch;
              result += effectiveColumnName
                ? `${effectiveColumnName} ${operator} ${rightSide}`
                : `${operator} ${rightSide}`;
            } else {
              // If text doesn't start with the column name (exact match), insert it
              if (!textVal.startsWith(effectiveColumnName + ' ') && !textVal.startsWith(effectiveColumnName + '.')) {
                result += effectiveColumnName ? `${effectiveColumnName} ${textVal}` : textVal;
              } else {
                result += textVal;
              }
            }
          }
        } else {
          // Query reference was found and processed
          // If text starts with '{', default operator is '='
          if (textVal.startsWith('{')) {
            result += effectiveColumnName ? `${effectiveColumnName} = ${modifiedText}` : `= ${modifiedText}`;
          } else {
            // Extract everything before the first '{' as the operator
            const parts = textVal.split('{');
            const operator = parts[0].trim();

            // Rebuild the modifiedText without the operator
            const rightSide = modifiedText.substring(operator.length);

            result += effectiveColumnName
              ? `${effectiveColumnName} ${operator} ${rightSide}`
              : `${operator} ${rightSide}`;
          }
        }
      } else if (token.type === 'OPERATOR') {
        hasOperator = true; // we found an OR/AND
        result += ` ${token.value} `;
      }
    }

    // Only wrap in parentheses if we found an OR or AND token
    // and the result isn't already wrapped in parentheses
    if (hasOperator && !(result.startsWith('(') && result.endsWith(')'))) {
      result = `(${result.trim()})`;
    } else {
      result = result.trim();
    }

    return result;
  };

  /**
   * 4) parseFilterCondition
   *    - The main function that combines tokenizeConditionString + buildConditionString.
   *    - For a raw condition like "= 'test' OR ='test2'", it returns "table.col = 'test' OR table.col = 'test2'".
   *    - Now also supports query references like "IN {Query Name}" which get replaced with subqueries.
   */
  const parseFilterCondition = (condition: string, columnName: string, queries: QueryType[]) => {
    const tokens = tokenizeConditionString(condition);
    return buildConditionString(tokens, columnName, queries);
  };

  /**
   * 5) buildFilters
   *    - For each row index i, gather conditions for all columns and join with "AND".
   *    - Then join each row with "OR".
   *    - Aggregate columns go to HAVING, otherwise WHERE.
   */
  const buildFilters = (columns: QueryColumnType[] = [], queries: QueryType[] = []) => {
    if (!Array.isArray(columns)) {
      return { where: '', having: '' };
    }

    // Figure out how many 'rows' of conditions we have
    const maxConditionsLength = Math.max(
      ...columns.map((col) => (Array.isArray(col.column_conditions) ? col.column_conditions.length : 0)),
      0,
    );

    const whereClauses = [];
    const havingClauses = [];

    for (let i = 0; i < maxConditionsLength; i += 1) {
      const rowWhere: string[] = [];
      const rowHaving: string[] = [];

      columns.forEach((column) => {
        const { table_name = '', column_name = '', table_alias = '', column_aggregate = '' } = column;
        const conditionArr = column.column_conditions || [];
        const condition = conditionArr[i];

        if (condition && condition.trim() !== '') {
          // Build a fully qualified column reference
          let colRef = '';

          // Check if this is an expression (contains operators)
          const isExpression = /[+\-*/||]/.test(column_name);

          if (isExpression) {
            // For expressions, use the expression directly with table reference
            const tableRef = table_alias || table_name;
            colRef = `${quoteIdentifier(tableRef)}.${column_name}`;
          } else if (table_alias && !_.isEmpty(table_alias)) {
            colRef = `${quoteIdentifier(table_alias)}.${quoteIdentifier(column_name)}`;
          } else {
            colRef = `${quoteIdentifier(table_name)}.${quoteIdentifier(column_name)}`;
          }

          // If we have an aggregate, that belongs to HAVING
          if (column_aggregate) {
            const aggRef = `${column_aggregate}(${colRef})`;
            rowHaving.push(parseFilterCondition(condition, aggRef, queries));
          } else {
            // Otherwise, normal WHERE
            rowWhere.push(parseFilterCondition(condition, colRef, queries));
          }
        }
      });

      // Join conditions in the same row with AND
      if (rowWhere.length > 0) {
        // Only add parentheses if there's more than one condition
        const whereClause = rowWhere.length > 1 ? `(${rowWhere.join(' AND ')})` : rowWhere[0];
        whereClauses.push(whereClause);
      }
      if (rowHaving.length > 0) {
        // Only add parentheses if there's more than one condition
        const havingClause = rowHaving.length > 1 ? `(${rowHaving.join(' AND ')})` : rowHaving[0];
        havingClauses.push(havingClause);
      }
    }

    // Only add outer parentheses if there's more than one clause
    const where = whereClauses.length > 1 ? whereClauses.join(' OR ') : whereClauses.join('');
    const having = havingClauses.length > 1 ? havingClauses.join(' OR ') : havingClauses.join('');

    return { where, having };
  };

  // Check if any column uses aggregation
  const hasAggregates = columns.some(
    (col) => !col.is_window_function && col.column_aggregate && col.column_aggregate.length > 0,
  );

  // Process columns for fields, orders, group by, etc.
  columns.forEach((column) => {
    if (!data.distinct && column.column_distinct_on) {
      query.distinct(`${quoteIdentifier(column.table_name)}.${quoteIdentifier(column.column_name)}`);
    }

    if (column.display_in_query) {
      if (column.is_window_function) {
        const functionName = (column.window_function_name || column.column_aggregate || 'ROW_NUMBER').toUpperCase();
        if (!/^[A-Z_][A-Z0-9_]*$/.test(functionName)) {
          throw new Error(`Invalid window function name: ${functionName}`);
        }

        const argument = ['ROW_NUMBER', 'RANK', 'DENSE_RANK'].includes(functionName)
          ? ''
          : column.column_name === '*'
            ? '*'
            : column.column_name !== column.column_name_original
              ? replaceColumnNamesWithQualified(column.column_name, data.tables)
              : `${quoteIdentifier(column.table_alias || column.table_name)}.${quoteIdentifier(column.column_name)}`;
        const partitionClause = column.window_partition_by ? `PARTITION BY ${column.window_partition_by}` : '';
        const orderClause = column.window_order_by ? `ORDER BY ${column.window_order_by}` : '';
        const overContent = [partitionClause, orderClause].filter(Boolean).join(' ');
        const alias = column.column_alias || `${functionName.toLowerCase()}_result`;

        query.field(`${functionName}(${argument}) OVER (${overContent})`, quoteIdentifier(alias));
        return;
      }

      // Special case for the '*' column (select all columns from a table)
      if (column.column_name === '*') {
        const tableRef = column.table_alias || column.table_name;
        query.field(`${quoteIdentifier(tableRef)}.*`);
        return;
      }

      // Generate automatic alias for aggregated or single line function columns if no alias is specified
      const hasInlineAlias = column.column_name.toUpperCase().includes(' AS ');
      const autoAlias = hasInlineAlias ? '' : column.column_alias;

      if (autoAlias.length === 0) {
        if (column.table_alias.length === 0) {
          let field = column.column_name;

          // If the column name is different from original, it might be an expression
          if (column.column_name !== column.column_name_original) {
            field = replaceColumnNamesWithQualified(column.column_name, data.tables);
          } else {
            field = `${quoteIdentifier(column.table_name)}.${quoteIdentifier(field)}`;
          }

          if (column.column_aggregate.length > 0) {
            // Aggregate with alias: aggregate(table.column)
            const tableRef = column.table_alias || column.table_name;
            field = `${column.column_aggregate}(${quoteIdentifier(tableRef)}.${quoteIdentifier(column.column_name)})`;
            query.field(field, quoteIdentifier(column.column_alias));
          } else if (column.column_single_line_function.length > 0) {
            field = `${column.column_single_line_function}(${quoteIdentifier(column.table_name)}.${quoteIdentifier(column.column_name)})`;
            query.field(field, quoteIdentifier(autoAlias));
          } else {
            // If column name is modified, use it directly without table prefix
            if (column.column_name === column.column_name_original) {
              addFieldWithAlias(column.table_name, column.column_name, autoAlias);
            } else {
              query.field(field, quoteIdentifier(autoAlias));
            }
          }
        } else {
          let field = column.column_name;

          // If the column name is different from original, it might be an expression
          if (column.column_name !== column.column_name_original) {
            field = replaceColumnNamesWithQualified(column.column_name, data.tables);
          } else {
            field = `${quoteIdentifier(column.table_alias)}.${quoteIdentifier(field)}`;
          }

          if (column.column_aggregate.length > 0) {
            // Aggregate with alias: aggregate(table.column)
            const tableRef = column.table_alias || column.table_name;
            field = `${column.column_aggregate}(${quoteIdentifier(tableRef)}.${quoteIdentifier(column.column_name)})`;
            query.field(field, quoteIdentifier(column.column_alias));
          } else if (column.column_single_line_function.length > 0) {
            field = `${column.column_single_line_function}(${quoteIdentifier(column.table_alias)}.${quoteIdentifier(column.column_name)})`;
            query.field(field, quoteIdentifier(autoAlias));
          } else {
            if (column.column_name === column.column_name_original) {
              addFieldWithAlias(column.table_alias, column.column_name, autoAlias);
            } else {
              query.field(field, quoteIdentifier(autoAlias));
            }
          }
        }
      } else {
        let field = column.column_name;

        // If the column name is different from original, it might be an expression
        if (column.column_name !== column.column_name_original) {
          field = replaceColumnNamesWithQualified(column.column_name, data.tables);
        } else {
          const tableRef = column.table_alias || column.table_name;
          field = `${quoteIdentifier(tableRef)}.${quoteIdentifier(field)}`;
        }

        if (column.column_aggregate.length > 0) {
          // Aggregate with alias: aggregate(table.column)
          const tableRef = column.table_alias || column.table_name;
          field = `${column.column_aggregate}(${quoteIdentifier(tableRef)}.${quoteIdentifier(column.column_name)})`;
          query.field(field, quoteIdentifier(column.column_alias));
        } else if (column.column_single_line_function.length > 0) {
          const tableRef = column.table_alias || column.table_name;
          field = `${column.column_single_line_function}(${quoteIdentifier(tableRef)}.${quoteIdentifier(column.column_name)})`;
          query.field(field, quoteIdentifier(autoAlias));
        } else {
          if (column.column_name === column.column_name_original) {
            const tableRef = column.table_alias || column.table_name;
            addFieldWithAlias(tableRef, column.column_name, autoAlias);
          } else {
            query.field(field, quoteIdentifier(autoAlias));
          }
        }
      }
    }

    // If we have aggregates, automatically add group by for non-aggregated displayed columns
    if (
      hasAggregates &&
      column.display_in_query &&
      (!column.column_aggregate || column.column_aggregate.length === 0)
    ) {
      const tableOrAlias = column.table_alias || column.table_name;
      let groupByExpr;

      if (column.column_single_line_function.length > 0) {
        // Use the function expression directly
        groupByExpr = `${column.column_single_line_function}(${quoteIdentifier(tableOrAlias)}.${quoteIdentifier(column.column_name)})`;
      } else if (column.column_alias.length > 0) {
        groupByExpr = quoteIdentifier(column.column_alias);
      } else {
        groupByExpr = `${quoteIdentifier(tableOrAlias)}.${quoteIdentifier(column.column_name)}`;
      }

      query.group(groupByExpr);
    }
  });

  // Add order by here only when Don't have sets
  if (data.sets.length === 0 && !isSetQuery) {
    // Handle ordering separately, sorted by column_order_nr
    columns
      // First filter to keep only columns that should be in ORDER BY (where column_order is true)
      .filter((column) => column.column_order)
      // Then sort those columns by their order_nr
      .sort((a, b) => {
        // Convert column_order_nr to number for sorting, defaulting to MAX_SAFE_INTEGER for nulls
        // This ensures columns without a specific order number appear last
        const aOrder = typeof a.column_order_nr === 'number' ? a.column_order_nr : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.column_order_nr === 'number' ? b.column_order_nr : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      })
      // Then add each column to the query's ORDER BY clause
      .forEach((column) => {
        addOrder(column, query);
      });
  }

  // Build and apply the WHERE and HAVING clauses
  const { where, having } = buildFilters(columns, queries);
  if (where) {
    query.where(where);
  }
  if (having) {
    query.having(having);
  }
};

/**
 * Processes and adds JOIN clauses to a query using the traditional method
 * Supports all PostgreSQL join types:
 * - INNER JOIN
 * - LEFT JOIN
 * - RIGHT JOIN
 * - FULL OUTER JOIN
 * - CROSS JOIN
 * @param data The query configuration object
 * @param query The squel query object to modify
 */
const addJoinsToQuery = (data: QueryType, query: squel.PostgresSelect) => {
  const joins = _.cloneDeep(data.joins);
  const mainTable = data.tables[0] ?? null;

  const addJoin = (joinObj: JoinType, on: string, joinFn: JoinMixin['join']) => {
    // If the main table is in the join, make sure it's always used in the FROM clause (not the JOIN)
    if (
      mainTable &&
      joinObj.main_table.table_schema === mainTable.table_schema &&
      joinObj.main_table.table_name === mainTable.table_name
    ) {
      return;
    }

    const tableName = `${quoteIdentifier(joinObj.main_table.table_schema)}.${quoteIdentifier(joinObj.main_table.table_name)}`;
    const tableAlias = joinObj.main_table.table_alias ? quoteIdentifier(joinObj.main_table.table_alias) : undefined;

    joinFn(tableName, tableAlias, on);
  };

  // Group joins by their main table and secondary table
  const groupedJoins: { [key: string]: JoinType[] } = {};

  joins.forEach((joinObj) => {
    if (!_.isEmpty(joinObj.main_table.table_name)) {
      const conditions = joinObj.conditions || [];
      conditions.forEach((condition) => {
        if (!_.isEmpty(condition.secondary_table.table_name)) {
          // If we have a join where main table equals secondary table (without different aliases), skip it
          if (
            joinObj.main_table.table_schema === condition.secondary_table.table_schema &&
            joinObj.main_table.table_name === condition.secondary_table.table_name &&
            joinObj.main_table.table_alias === condition.secondary_table.table_alias
          ) {
            return;
          }

          let key;
          if (condition.secondary_table.id === mainTable?.id) {
            key = `${condition.secondary_table.table_name}_${joinObj.main_table.table_name}`;
          } else {
            key = `${joinObj.main_table.table_name}_${condition.secondary_table.table_name}`;
          }

          if (!groupedJoins[key]) {
            groupedJoins[key] = [];
          }
          groupedJoins[key].push(joinObj);
        }
      });
    }
  });

  // Process each group of joins
  Object.keys(groupedJoins).forEach((key) => {
    const joinGroup = groupedJoins[key];
    if (joinGroup.length > 0) {
      const templateJoin = joinGroup[0];
      const allConditions: string[] = [];

      joinGroup.forEach((joinObj) => {
        const conditions = joinObj.conditions || [];
        conditions.forEach((condition) => {
          if (
            !_.isEmpty(condition.main_column) &&
            !_.isEmpty(condition.secondary_column) &&
            !_.isEmpty(condition.secondary_table.table_name) &&
            condition.secondary_table.table_name === templateJoin.conditions[0].secondary_table.table_name
          ) {
            if (
              joinObj.main_table.table_schema === condition.secondary_table.table_schema &&
              joinObj.main_table.table_name === condition.secondary_table.table_name &&
              joinObj.main_table.table_alias === condition.secondary_table.table_alias
            ) {
              return;
            }

            const mainTable = joinObj.main_table.table_alias || joinObj.main_table.table_name;
            const secondaryTable = condition.secondary_table.table_alias || condition.secondary_table.table_name;

            const isSecondaryTableMain = condition.secondary_table.id === mainTable?.id;

            let conditionString = '';
            if (isSecondaryTableMain) {
              conditionString = `${quoteIdentifier(secondaryTable)}.${quoteIdentifier(condition.secondary_column)} = ${quoteIdentifier(mainTable)}.${quoteIdentifier(condition.main_column)}`;
            } else {
              conditionString = `${quoteIdentifier(mainTable)}.${quoteIdentifier(condition.main_column)} = ${quoteIdentifier(secondaryTable)}.${quoteIdentifier(condition.secondary_column)}`;
            }

            allConditions.push(conditionString);
          }
        });
      });

      const combinedOn = allConditions.join(' AND ');

      if (!_.isEmpty(combinedOn)) {
        if (templateJoin.main_table.id === mainTable?.id) {
          const secondaryTable = templateJoin.conditions[0]?.secondary_table;
          if (secondaryTable && !_.isEmpty(secondaryTable.table_name)) {
            const modifiedJoin = {
              ...templateJoin,
              main_table: secondaryTable,
            };
            switch (templateJoin.type) {
              case 'inner':
                addJoin(modifiedJoin, combinedOn, query.join);
                break;
              case 'right':
                addJoin(modifiedJoin, combinedOn, query.right_join);
                break;
              case 'left':
                addJoin(modifiedJoin, combinedOn, query.left_join);
                break;
              case 'outer':
                addJoin(modifiedJoin, combinedOn, query.outer_join);
                break;
              case 'cross':
                addJoin(modifiedJoin, combinedOn, query.cross_join);
                break;
              default:
                break;
            }
          }
        } else {
          switch (templateJoin.type) {
            case 'inner':
              addJoin(templateJoin, combinedOn, query.join);
              break;
            case 'right':
              addJoin(templateJoin, combinedOn, query.right_join);
              break;
            case 'left':
              addJoin(templateJoin, combinedOn, query.left_join);
              break;
            case 'outer':
              addJoin(templateJoin, combinedOn, query.outer_join);
              break;
            case 'cross':
              addJoin(templateJoin, combinedOn, query.cross_join);
              break;
            default:
              break;
          }
        }
      }
    }
  });
};

/**
 * Processes and adds JOIN clauses to a query using drag-and-drop interface data
 * Provides a more intuitive way to build joins based on visual relationships
 * between tables. Handles complex join scenarios and prevents circular references.
 * @param data The query configuration object
 * @param query The squel query object to modify
 */
const addJoinsToQueryByDragAndDrop = (data: QueryType, query: squel.PostgresSelect) => {
  const joins = _.cloneDeep(data.joins);
  const mainTable = data.tables[0] ?? null;

  const usedTables = new Set<string>();

  const getTableKey = (table: { table_schema: string; table_name: string; table_alias?: string }) =>
    `${table.table_schema}.${table.table_name}.${table.table_alias || ''}`;

  const markTableAsUsed = (table: { table_schema: string; table_name: string; table_alias?: string }) => {
    usedTables.add(getTableKey(table));
  };

  const isTableUsed = (table: { table_schema: string; table_name: string; table_alias?: string }) =>
    usedTables.has(getTableKey(table));

  if (mainTable) {
    markTableAsUsed(mainTable);
  }

  const getJoinFunction = (type: string): JoinMixin['join'] => {
    switch (type) {
      case 'inner':
        return query.join;
      case 'left':
        return query.left_join;
      case 'right':
        return query.right_join;
      case 'outer':
        return query.outer_join;
      case 'cross':
        return query.cross_join;
      default:
        return query.join;
    }
  };

  // Dependency-aware ordering of joins
  const orderedJoins: JoinType[] = [];
  const remaining = [...joins];
  const maxTries = joins.length * 2;
  let tries = 0;

  while (remaining.length && tries < maxTries) {
    for (let i = 0; i < remaining.length; i++) {
      const join = remaining[i];
      const mainUsed = isTableUsed(join.main_table);
      const secondaryUsed = join.conditions.some((cond) => isTableUsed(cond.secondary_table));

      if (mainUsed || secondaryUsed) {
        orderedJoins.push(join);
        remaining.splice(i, 1);
        i--;
      }
    }
    tries++;
  }

  if (remaining.length) {
    console.warn('Unresolved join ordering issue:', remaining);
    orderedJoins.push(...remaining);
  }

  // Merge joins by involved tables (sorted for order-agnostic merge)
  const mergedJoins: Record<string, { join: JoinType; conditions: string[] }> = {};

  orderedJoins.forEach((join) => {
    const involvedTables = [
      getTableKey(join.main_table),
      ...join.conditions.map((cond) => getTableKey(cond.secondary_table)),
    ]
      .sort()
      .join('::'); // Sort to avoid order dependency

    const key = involvedTables + `::${join.type}`;

    if (!mergedJoins[key]) {
      mergedJoins[key] = { join, conditions: [] };
    }

    join.conditions.forEach((cond) => {
      const mainTableAlias = cond.main_table.table_alias || cond.main_table.table_name;
      const secondaryTableAlias = cond.secondary_table.table_alias || cond.secondary_table.table_name;
      const conditionStr = `${quoteIdentifier(mainTableAlias)}.${quoteIdentifier(cond.main_column)} = ${quoteIdentifier(secondaryTableAlias)}.${quoteIdentifier(cond.secondary_column)}`;
      mergedJoins[key].conditions.push(conditionStr);
    });
  });

  // Apply joins correctly!
  Object.values(mergedJoins).forEach(({ join, conditions }) => {
    const firstCondition = join.conditions[0];
    if (!firstCondition) {
      console.warn('Skipping join because no conditions found:', join);
      return;
    }

    const mainTableKey = getTableKey(join.main_table);
    const secondaryTableKeys = join.conditions.map((cond) => getTableKey(cond.secondary_table));

    const allSecondaryUsed = secondaryTableKeys.every((key) => usedTables.has(key));
    const mainUsed = usedTables.has(mainTableKey);

    let joinTarget;

    if (mainUsed && !allSecondaryUsed) {
      joinTarget = join.conditions[0].secondary_table;
    } else if (!mainUsed && allSecondaryUsed) {
      joinTarget = join.main_table;
    } else if (!mainUsed && !allSecondaryUsed) {
      // Pick secondary by default (or adjust this logic if needed)
      joinTarget = join.conditions[0].secondary_table;
    } else {
      // This used to skip, but now we allow the join (to avoid deadlocks):
      console.warn('Both sides seem used, but join might still be needed (alias collision or complex logic):', join);
      return; // <-- This prevents duplicate joins!
    }

    const joinAlias = joinTarget.table_alias || undefined;
    const joinRef = `${quoteIdentifier(joinTarget.table_schema)}.${quoteIdentifier(joinTarget.table_name)}`;

    const joinFn = getJoinFunction(join.type);
    const onCondition = conditions.join(' AND ');

    joinFn(joinRef, joinAlias, onCondition);
    markTableAsUsed(joinTarget);
  });
};

/**
 * Builds and adds set operations (UNION, INTERSECT, EXCEPT) to a query
 * Supports both regular and ALL variants of set operations
 * @param data The query configuration object
 * @param queries Array of all queries for subquery resolution
 * @returns The complete set operation SQL string
 */
const buildSetQuery = (data: QueryType, queries: QueryType[]) => {
  const sets = _.cloneDeep(data.sets);
  let setQuery = '';

  sets.forEach((set) => {
    const subQueryId = set.subqueryId;
    const subQuery = queries.find((query) => query.id === subQueryId);
    if (!subQuery) return;

    const cleanSubquerySql = buildQuery({ data: subQuery, queries, isSetQuery: true });

    if (set.subquerySql.length) {
      switch (set.type) {
        case 'union': {
          setQuery += `\nUNION\n${cleanSubquerySql}`;
          break;
        }
        case 'unionall': {
          setQuery += `\nUNION ALL\n${cleanSubquerySql}`;
          break;
        }
        case 'intersect': {
          setQuery += `\nINTERSECT\n${cleanSubquerySql}`;
          break;
        }
        case 'intersectall': {
          setQuery += `\nINTERSECT ALL\n${cleanSubquerySql}`;
          break;
        }
        case 'except': {
          setQuery += `\nEXCEPT\n${cleanSubquerySql}`;
          break;
        }
        case 'exceptall': {
          setQuery += `\nEXCEPT ALL\n${cleanSubquerySql}`;
          break;
        }
        default:
          break;
      }
    }
  });

  return setQuery;
};

/**
 * Adds tables to the FROM clause of a query
 * Handles both simple table references and complex join scenarios
 * @param data The query configuration object
 * @param query The squel query object to modify
 * @param queries Array of all queries for subquery support
 */
const addTablesToQuery = (data: QueryType, query: squel.PostgresSelect, queries: QueryType[]) => {
  const addTable = (table: QueryTableType) => {
    if (_.isEmpty(table.table_alias)) {
      query.from(`${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)}`);
    } else {
      query.from(
        `${quoteIdentifier(table.table_schema)}.${quoteIdentifier(table.table_name)}`,
        quoteIdentifier(table.table_alias),
      );
    }
  };

  if (data.tables.length > 0) {
    const tables = _.cloneDeep(data.tables);

    if (_.isEmpty(data.joins)) {
      tables.forEach((table) => {
        addTable(table);
      });
    } else {
      addTable(tables[0]);
      if (data.isDragAndDrop) {
        addJoinsToQueryByDragAndDrop(data, query);
      } else {
        addJoinsToQuery(data, query);
      }
      buildSetQuery(data, queries);
    }
  }
};

/**
 * Main query builder function that orchestrates the creation of a complete SELECT query
 * @param data The query configuration object
 * @param queries Array of all queries for subquery support
 * @param isSetQuery Whether this query is part of a set operation
 * @returns The complete SQL query string
 */
export const buildQuery = ({
  data,
  queries,
  isSetQuery,
}: {
  data: QueryType;
  queries: QueryType[];
  isSetQuery?: boolean;
}) => {
  const query = squelPostgres.select({
    useAsForTableAliasNames: true,
    fieldAliasQuoteCharacter: '',
    tableAliasQuoteCharacter: '',
    nameQuoteCharacter: '"',
    separator: '\n',
  });

  if (data.distinct) {
    query.distinct();
  }

  if (queries) {
    addColumnsToQuery(data, query, queries, isSetQuery);
  }
  addTablesToQuery(data, query, queries);

  const setQueryString = buildSetQuery(data, queries).replace(/;$/, '');

  let orderByString = '';
  if (setQueryString.length > 0) {
    orderByString = addOrderByForSetQuery(queries);
  }

  if (data.limit && data.limitValue) {
    return `${`${query.toString() + setQueryString + orderByString}\n` + `FETCH FIRST ${data.limitValue} ROWS ${data.withTies ? 'WITH TIES;' : 'ONLY;'}`}`;
  }

  return `${query}${setQueryString}${orderByString};`;
};

/**
 * Adds ORDER BY clauses for set operations
 * Handles ordering across multiple queries in a set operation
 * @param queries Array of all queries to process
 * @returns The ORDER BY clause SQL string
 */
const addOrderByForSetQuery = (queries: QueryType[]) => {
  const orderByClauses: string[] = [];

  queries.forEach((query) => {
    query.columns
      .filter((column) => column.column_order)
      .sort((a, b) => {
        const aOrder = typeof a.column_order_nr === 'number' ? a.column_order_nr : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof b.column_order_nr === 'number' ? b.column_order_nr : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      })
      .forEach((column) => {
        // For set queries, use just the column name or alias without table prefix
        const columnRef =
          column.column_alias.length > 0 ? quoteIdentifier(column.column_alias) : quoteIdentifier(column.column_name);

        const nullsPosition = column.column_nulls_position ? ` NULLS ${column.column_nulls_position}` : '';
        orderByClauses.push(`${columnRef} ${column.column_order_dir ? 'ASC' : 'DESC'}${nullsPosition}`);
      });
  });

  return orderByClauses.length > 0 ? `\nORDER BY ${orderByClauses.join(', ')}` : '';
};

/**
 * Builds filter conditions for WHERE and HAVING clauses
 * Supports complex conditions with AND/OR logic
 * @param data The query configuration object
 * @returns The WHERE clause SQL string
 */
const addFilterToQueryNew = (data: QueryType) => {
  const columns = _.cloneDeep(data.columns);

  let whereQuery = '';
  const filterList: { id: number; filter: string }[] = [];
  let filterLength = 0;

  if (columns[0]) {
    filterLength = columns[0].column_filters.length;
  }

  columns.forEach((column: QueryColumnType) => {
    column.column_filters.forEach((filter) => {
      if (filter.filter.length > 0 && !column.returningOnly) {
        filterList.push({
          id: filter.id,
          filter: `${quoteIdentifier(column.table_name)}.${quoteIdentifier(column.column_name)} ${filter.filter}`,
        });
      }
    });
  });

  const finalFilter = [];

  for (let i = 0; i < filterLength + 1; i += 1) {
    const filterRow: string[] = [];
    filterList.forEach((filterCell) => {
      if (filterCell.id === i) {
        filterRow.push(filterCell.filter);
      }
    });
    if (filterRow.length > 0) {
      finalFilter.push(`(${filterRow.join(' AND ')})`);
    }
  }
  whereQuery += finalFilter.join(' OR ');

  if (whereQuery.length > 0) {
    return `(${whereQuery})`;
  }

  return whereQuery;
};

/**
 * Extracts tables used in USING clauses
 * @param data The query configuration object
 * @returns Array of table references for USING clause
 */
const getUsingTables = (data: QueryType) => {
  const usings = _.cloneDeep(data.using);

  const usingTables: string[] = [];

  usings.forEach((using) => {
    usingTables.push(
      `${quoteIdentifier(using.main_table.table_schema)}.${quoteIdentifier(using.main_table.table_name)}`,
    );
  });

  return usingTables;
};

/**
 * Builds conditions for USING clauses
 * @param data The query configuration object
 * @returns Array of condition strings for USING clause
 */
const getUsingConditions = (data: QueryType) => {
  const usings = _.cloneDeep(data.using);

  const usingConditions: string[] = [];

  usings.forEach((using) => {
    using.conditions.forEach((condition) => {
      usingConditions.push(
        `${quoteIdentifier(condition.secondary_table.table_name)}.${quoteIdentifier(condition.secondary_column)} = ${quoteIdentifier(using.main_table.table_name)}.${quoteIdentifier(condition.main_column)}`,
      );
    });
  });

  return usingConditions;
};

/**
 * Processes RETURNING clause for DML operations
 * @param data The query configuration object
 * @returns The RETURNING clause SQL string
 */
const addReturningToQuery = (data: QueryType) => {
  const columns = _.cloneDeep(data.columns);

  let returning = '';
  const returningColumns: string[] = [];

  columns.forEach((column) => {
    if (column.returning || column.returningOnly) {
      // Always quote the alias if present, otherwise table/col
      if (column.column_alias && column.column_alias.length > 0) {
        returningColumns.push(quoteIdentifier(column.column_alias));
      } else {
        returningColumns.push(`${quoteIdentifier(column.table_name)}.${quoteIdentifier(column.column_name)}`);
      }
    }
  });

  returning += returningColumns.join(', ');

  if (data.returning) {
    return '*';
  }
  return returning;
};

/**
 * Processes values for INSERT operations
 * Handles multiple rows and NULL values
 * @param data The query configuration object
 * @param query The squel insert query object
 * @returns Array of value lists for insertion
 */
const addInsertValuesToQuery = (data: QueryType, query: squel.PostgresInsert) => {
  const columns = _.cloneDeep(data.columns);
  const valuesList = [];

  for (let i = 0; i < data.rows; i += 1) {
    const valueRow: Record<string, string> = {};

    columns.forEach((column) => {
      if (!column.returningOnly) {
        if (column.column_values[i].value === '') {
          valueRow[column.column_name] = 'NULL';
        } else {
          valueRow[column.column_name] = column.column_values[i].value;
        }
      }
    });

    query.setFields(valueRow, { ignorePeriodsForFieldNameQuotes: true });
    valuesList.push(query.toString().split('\n').slice(-1).toString().split('VALUES').slice(-1));
  }
  return valuesList;
};

/**
 * Processes column values for UPDATE operations
 * @param data The query configuration object
 * @param query The squel update query object
 */
const addUpdateValuesToQuery = (data: QueryType, query: squel.PostgresUpdate) => {
  const columns = _.cloneDeep(data.columns);

  columns.forEach((column) => {
    if (!column.returningOnly && column.table_id === data.tables[0].id && column.value_enabled) {
      query.set(column.column_name, column.column_value, { dontQuote: true });
    }
  });
};

/**
 * Builds a complete DELETE query with USING and WHERE clauses
 * @param data The query configuration object
 * @returns The complete DELETE query SQL string
 */
export const buildDeleteQuery = (data: QueryType) => {
  const query = squelPostgres.delete({
    useAsForTableAliasNames: true,
    fieldAliasQuoteCharacter: '',
    tableAliasQuoteCharacter: '',
    nameQuoteCharacter: '"',
    separator: '\n',
  });

  query.from(`${quoteIdentifier(data.tables[0].table_schema)}.${quoteIdentifier(data.tables[0].table_name)}`);

  const usingTables = getUsingTables(data);
  const usingConditions = getUsingConditions(data);

  return `${`${
    query.toString() +
    (usingTables.length > 0
      ? `\nUSING ${usingTables.join(', ')}\n` +
        'WHERE ' +
        `(${usingConditions.join(' AND ')})` +
        (addFilterToQueryNew(data).length > 0 ? ` AND ${addFilterToQueryNew(data)}` : '')
      : addFilterToQueryNew(data).length > 0
        ? `\nWHERE ${addFilterToQueryNew(data)}`
        : '')
  }\n${addReturningToQuery(data).length > 0 ? `RETURNING ${addReturningToQuery(data)}` : ''}`};`;
};

/**
 * Builds a complete INSERT query with VALUES and RETURNING clauses
 * @param data The query configuration object
 * @returns The complete INSERT query SQL string
 */
export const buildInsertQuery = (data: QueryType) => {
  try {
    // Check if there are any tables
    if (!data.tables || data.tables.length === 0) {
      return '';
    }

    const query = squelPostgres.insert({
      useAsForTableAliasNames: true,
      fieldAliasQuoteCharacter: '',
      tableAliasQuoteCharacter: '',
      nameQuoteCharacter: '"',
      separator: '\n',
    });

    query.into(`${quoteIdentifier(data.tables[0].table_schema)}.${quoteIdentifier(data.tables[0].table_name)}`);

    const columnString: string[] = [];
    data.columns.forEach((column) => {
      if (!column.returningOnly) {
        columnString.push(quoteIdentifier(column.column_name));
      }
    });

    if (data.fromQuery) {
      const columnsPart = columnString.length > 0 ? `(${columnString.join(', ')})` : '';
      const subqueryPart = data.subquerySql.slice(0, -1);
      const returningPart = addReturningToQuery(data).length > 0 ? `RETURNING ${addReturningToQuery(data)}` : '';

      return `${query.toString()} ${columnsPart}\n${subqueryPart}\n${returningPart};`;
    }

    const lastQueryLine = query.toString().split('\n').slice(-1).join('\n');
    const columnsPart =
      columnString.length > 0
        ? `(${columnString.join(', ')})\nVALUES ${addInsertValuesToQuery(data, query).join(',')}\n`
        : '';
    const returningPart = addReturningToQuery(data).length > 0 ? `RETURNING ${addReturningToQuery(data)}` : '';

    return `INSERT\n${lastQueryLine} ${columnsPart}${returningPart};`;
  } catch (error) {
    // Return an empty string or a default query instead of throwing
    console.error('Error building INSERT query:', error);
    return '';
  }
};

/**
 * Builds a complete UPDATE query with SET, FROM, WHERE, and RETURNING clauses
 * @param data The query configuration object
 * @returns The complete UPDATE query SQL string
 */
export const buildUpdateQuery = (data: QueryType) => {
  const query = squelPostgres.update({
    useAsForTableAliasNames: true,
    fieldAliasQuoteCharacter: '',
    tableAliasQuoteCharacter: '',
    nameQuoteCharacter: '"',
    separator: '\n',
  });

  query.table(`${quoteIdentifier(data.tables[0].table_schema)}.${quoteIdentifier(data.tables[0].table_name)}`);

  addUpdateValuesToQuery(data, query);

  const usingTables = getUsingTables(data);
  const usingConditions = getUsingConditions(data);

  return `${`${
    query.toString() +
    (usingTables.length > 0
      ? `\nFROM ${usingTables.join(', ')}\n` +
        'WHERE ' +
        `(${usingConditions.join(' AND ')})` +
        (addFilterToQueryNew(data).length > 0 ? ` AND ${addFilterToQueryNew(data)}` : '')
      : addFilterToQueryNew(data).length > 0
        ? `\nWHERE ${addFilterToQueryNew(data)}`
        : '')
  }\n${addReturningToQuery(data).length > 0 ? `RETURNING ${addReturningToQuery(data)}` : ''}`};`;
};
