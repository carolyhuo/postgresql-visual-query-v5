import { AST, Select } from 'node-sql-parser';
import { DatabaseColumnType, DatabaseConstraintType, DatabaseTableType } from '../types/databaseTypes';
import { CTEType, JoinConditionType, JoinType, QueryColumnType, QueryTableType, QueryType } from '../types/queryTypes';
import { createEmptyColumn } from './columnUtils';
import { createCteTable } from './cteTableUtils';

interface SqlCanvasMetadata {
  tables: DatabaseTableType[];
  columns: DatabaseColumnType[];
  constraints: DatabaseConstraintType[];
}

type AstRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AstRecord => typeof value === 'object' && value !== null;
const readRecord = (value: unknown): AstRecord | null => (isRecord(value) ? value : null);
const readString = (value: unknown): string => (typeof value === 'string' ? value : '');
const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

const readColumnName = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  const expression = readRecord(value)?.expr;
  return readString(readRecord(expression)?.value);
};

const unwrapExpression = (value: unknown): AstRecord | null => {
  const record = readRecord(value);
  if (record?.type === 'expr') {
    return readRecord(record.expr);
  }
  return record;
};

const readColumnReference = (value: unknown): { table: string; column: string } | null => {
  const expression = unwrapExpression(value);
  if (expression?.type !== 'column_ref') {
    return null;
  }

  return {
    table: readString(expression.table),
    column: readColumnName(expression.column),
  };
};

const sqlForColumnReference = (value: unknown, tables: QueryTableType[]): string => {
  const reference = readColumnReference(value);
  if (!reference) {
    return '';
  }
  const table = tables.find((item) => item.table_alias === reference.table || item.table_name === reference.table);
  const tableReference = table?.table_alias || table?.table_name || reference.table;
  return tableReference
    ? `${quoteIdentifier(tableReference)}.${quoteIdentifier(reference.column)}`
    : quoteIdentifier(reference.column);
};

const formatSqlOperand = (value: unknown, tables: QueryTableType[]): string => {
  const expression = unwrapExpression(value);
  if (!expression) {
    throw new Error('The WHERE clause contains an unsupported value.');
  }
  if (expression.type === 'column_ref') {
    return sqlForColumnReference(expression, tables);
  }
  if (expression.type === 'number') {
    return String(expression.value);
  }
  if (expression.type === 'single_quote_string' || expression.type === 'string') {
    const stringValue = readString(expression.value);
    return `'${stringValue.replace(/'/g, "''")}'`;
  }
  if (expression.type === 'null') {
    return 'NULL';
  }
  if (expression.type === 'bool') {
    return expression.value ? 'TRUE' : 'FALSE';
  }
  if (expression.type === 'binary_expr') {
    const left = formatSqlOperand(expression.left, tables);
    const right = formatSqlOperand(expression.right, tables);
    return `${left} ${readString(expression.operator)} ${right}`;
  }
  if (expression.type === 'unary_expr') {
    return `${readString(expression.operator)}${formatSqlOperand(expression.expr, tables)}`;
  }
  throw new Error(`The WHERE clause contains an unsupported ${readString(expression.type) || 'value'} expression.`);
};

const applyWhereConditions = (
  where: unknown,
  columns: QueryColumnType[],
  tables: QueryTableType[],
  metadata: SqlCanvasMetadata,
  isHaving = false,
): QueryColumnType[] => {
  if (!where) {
    return columns;
  }

  const result = [...columns];
  const conditionIndexes = new Map<number, number>();
  const applyCondition = (condition: AstRecord) => {
    const leftExpression = unwrapExpression(condition.left);
    const aggregateName = isHaving ? readString(leftExpression?.name).toUpperCase() : '';
    const aggregateArgs = readRecord(leftExpression?.args);
    const leftReference = readColumnReference(isHaving && aggregateName ? aggregateArgs?.expr : condition.left);
    const leftColumnName = leftReference?.column || readColumnName(leftExpression?.column);
    if (!leftColumnName) {
      throw new Error(`The ${isHaving ? 'HAVING' : 'WHERE'} condition left side must resolve to a column.`);
    }
    let target = result.find((column) => {
      const matchesColumn =
        column.column_name === leftColumnName || (isHaving && column.column_alias === leftColumnName);
      const matchesAggregate = !isHaving || !aggregateName || column.column_aggregate === aggregateName;
      const matchesTable =
        !leftReference?.table ||
        column.table_alias === leftReference.table ||
        column.table_name === leftReference.table;
      return matchesColumn && matchesAggregate && matchesTable;
    });

    if (!target) {
      target = mapSelectExpression(condition.left, null, tables, result.length + 1, metadata);
      target.display_in_query = false;
      if (isHaving && aggregateName) {
        target.column_aggregate = aggregateName;
      }
      result.push(target);
    }

    const conditionIndex = conditionIndexes.get(target.id) || 0;
    const operator = readString(condition.operator).toUpperCase();
    const operand = formatSqlOperand(condition.right, tables);
    const conditionText = `${operator} ${operand}`;
    target.column_conditions = [...target.column_conditions];
    target.column_conditions[conditionIndex] = conditionText;
    conditionIndexes.set(target.id, conditionIndex + 1);
  };

  const visit = (node: unknown) => {
    const condition = readRecord(node);
    if (!condition) {
      throw new Error('The WHERE clause contains an unsupported condition.');
    }
    const operator = readString(condition.operator).toUpperCase();
    if (condition.type === 'binary_expr' && (operator === 'AND' || operator === 'OR')) {
      visit(condition.left);
      visit(condition.right);
      return;
    }
    if (condition.type !== 'binary_expr') {
      throw new Error('Only binary WHERE conditions can be mapped to the canvas.');
    }
    applyCondition(condition);
  };

  visit(where);
  return result;
};

const mapSelectExpression = (
  expressionInput: unknown,
  aliasInput: unknown,
  tables: QueryTableType[],
  id: number,
  metadata: SqlCanvasMetadata,
  forcedTable?: QueryTableType,
): QueryColumnType => {
  const expression = unwrapExpression(expressionInput);
  const alias = readString(aliasInput);
  const windowFunction = expression?.type === 'window_func' || Boolean(expression?.over);
  const aggregateFunction = expression?.type === 'aggr_func' && !windowFunction;
  const functionName = readString(expression?.name).toUpperCase();
  const args = readRecord(expression?.args);
  const argumentExpressions =
    args?.type === 'expr_list' && Array.isArray(args.value) ? args.value : args?.expr ? [args.expr] : [];
  const argumentReference = readColumnReference(argumentExpressions[0]);
  const directReference = readColumnReference(expression);
  const reference = directReference || argumentReference;
  const columnName = reference?.column || '*';
  const table =
    forcedTable ||
    (reference
      ? reference.table
        ? tables.find((item) => item.table_alias === reference.table || item.table_name === reference.table)
        : tables.find((item) => item.columns.some((column) => column.column_name === columnName)) ||
          (tables.length === 1 ? tables[0] : undefined)
      : undefined);
  const databaseColumn = table
    ? metadata.columns.find(
        (column) =>
          column.table_name === table.table_name &&
          column.table_schema === table.table_schema &&
          column.column_name === columnName,
      )
    : undefined;
  const constraints = table
    ? metadata.constraints
        .filter(
          (constraint) =>
            constraint.table_name === table.table_name &&
            constraint.table_schema === table.table_schema &&
            constraint.column_name === columnName,
        )
        .map((constraint) => ({
          column_name: constraint.column_name,
          constraint_name: constraint.constraint_name,
          constraint_type: constraint.constraint_type,
          foreign_column_name: constraint.foreign_column_name || null,
          foreign_table_name: constraint.foreign_table_name || null,
          foreign_table_schema: constraint.foreign_table_schema || null,
          table_name: constraint.table_name,
          table_schema: constraint.table_schema,
        }))
    : [];

  const mapped = createEmptyColumn({
    id,
    column_name: columnName,
    column_name_original: columnName,
    column_alias: alias,
    table_name: table?.table_name || reference?.table || '',
    table_schema: table?.table_schema || '',
    table_alias: table?.table_alias || '',
    table_id: table?.id || 0,
    data_type: databaseColumn?.data_type || '',
    ordinal_position: databaseColumn?.ordinal_position || 0,
    constraints,
    display_in_query: true,
    column_aggregate: aggregateFunction ? functionName : '',
    is_window_function: windowFunction,
    window_function_name: windowFunction ? functionName : '',
  });

  if (windowFunction) {
    mapped.window_function_arguments = argumentExpressions
      .map((argument) => formatSqlOperand(argument, tables))
      .join(', ');
    const over = readRecord(expression?.over);
    const specification = readRecord(readRecord(over?.as_window_specification)?.window_specification);
    const partitionByValue = specification?.partitionby;
    const orderByValue = specification?.orderby;
    const partitionBy = Array.isArray(partitionByValue) ? partitionByValue : [];
    const orderBy = Array.isArray(orderByValue) ? orderByValue : [];
    mapped.window_partition_by = partitionBy
      .map((partition) => {
        const record = readRecord(partition);
        const expressions = record?.expr;
        const exprs = Array.isArray(expressions) ? expressions : expressions ? [expressions] : [];
        return exprs
          .map((item) => sqlForColumnReference(item, tables))
          .filter(Boolean)
          .join(', ');
      })
      .filter(Boolean)
      .join(', ');
    const firstOrder = readRecord(orderBy[0]);
    const orderReference = sqlForColumnReference(firstOrder?.expr, tables);
    const orderDirection = readString(firstOrder?.type).toUpperCase();
    mapped.window_order_by = orderReference ? `${orderReference} ${orderDirection || 'ASC'}` : '';
  }

  return mapped;
};

const mapFromTables = (
  select: Select,
  metadata: SqlCanvasMetadata,
  knownCtes: CTEType[],
): { tables: QueryTableType[]; joins: JoinType[] } => {
  const fromItems = Array.isArray(select.from) ? select.from : select.from ? [select.from] : [];
  const tables: QueryTableType[] = [];
  const joins: JoinType[] = [];

  fromItems.forEach((item, index) => {
    const fromRecord = readRecord(item);
    const tableName = readString(fromRecord?.table);
    if (!tableName) {
      return;
    }
    const tableSchema = readString(fromRecord?.db);
    const alias = readString(fromRecord?.as);
    const cte = knownCtes.find((itemCte) => itemCte.name === tableName);
    const databaseTable = metadata.tables.find(
      (databaseItem) =>
        databaseItem.table_name === tableName && (!tableSchema || databaseItem.table_schema === tableSchema),
    );
    const tableId = index + 1;
    const tableColumns = cte
      ? createCteTable(cte).columns.map((column, columnIndex) => ({
          ...column,
          id: columnIndex + 1,
          table_id: tableId,
          table_alias: alias,
        }))
      : metadata.columns
          .filter(
            (column) =>
              column.table_name === tableName &&
              (!tableSchema || column.table_schema === tableSchema) &&
              (!databaseTable || column.table_schema === databaseTable.table_schema),
          )
          .map((column, columnIndex) =>
            createEmptyColumn({
              id: columnIndex + 1,
              column_name: column.column_name,
              column_name_original: column.column_name,
              table_name: tableName,
              table_schema: column.table_schema,
              table_alias: alias,
              table_id: tableId,
              data_type: column.data_type,
              ordinal_position: column.ordinal_position,
              constraints: metadata.constraints
                .filter(
                  (constraint) =>
                    constraint.table_name === tableName &&
                    constraint.table_schema === column.table_schema &&
                    constraint.column_name === column.column_name,
                )
                .map((constraint) => ({
                  column_name: constraint.column_name,
                  constraint_name: constraint.constraint_name,
                  constraint_type: constraint.constraint_type,
                  foreign_column_name: constraint.foreign_column_name || null,
                  foreign_table_name: constraint.foreign_table_name || null,
                  foreign_table_schema: constraint.foreign_table_schema || null,
                  table_name: constraint.table_name,
                  table_schema: constraint.table_schema,
                })),
            }),
          );
    tables.push({
      id: tableId,
      table_name: tableName,
      table_schema: cte ? '' : tableSchema || databaseTable?.table_schema || '',
      table_type: cte ? 'CTE' : databaseTable?.table_type || 'BASE TABLE',
      table_alias: alias,
      selectIndex: index,
      columns: tableColumns,
    });

    const joinType = readString(fromRecord?.join);
    if (joinType && tables.length > 1) {
      const on = readRecord(fromRecord?.on);
      const conditions: JoinConditionType[] = [];
      const appendCondition = (condition: AstRecord | null) => {
        if (!condition) return;
        if (condition.type === 'binary_expr' && readString(condition.operator).toUpperCase() === 'AND') {
          appendCondition(readRecord(condition.left));
          appendCondition(readRecord(condition.right));
          return;
        }
        if (condition.type !== 'binary_expr' || readString(condition.operator) !== '=') return;
        const left = readColumnReference(condition.left);
        const right = readColumnReference(condition.right);
        if (!left || !right) return;
        const leftTable = tables.find((table) => table.table_alias === left.table || table.table_name === left.table);
        const rightTable = tables.find(
          (table) => table.table_alias === right.table || table.table_name === right.table,
        );
        if (!leftTable || !rightTable) return;
        conditions.push({
          id: conditions.length,
          main_column: left.column,
          main_table: leftTable,
          secondary_column: right.column,
          secondary_table: rightTable,
        });
      };
      appendCondition(on);
      joins.push({
        id: joins.length,
        type: joinType.toLowerCase().includes('outer') ? 'outer' : joinType.toLowerCase().replace(/\s+join$/, ''),
        color: '#5b8def',
        main_table: conditions[0]?.main_table || tables[tables.length - 2],
        conditions,
      });
    }
  });

  return { tables, joins };
};

const isSelect = (ast: AST): ast is Select => ast.type === 'select';
const isSelectAst = (ast: unknown): ast is Select =>
  isRecord(ast) && ast.type === 'select' && Array.isArray(ast.columns);

export const normalizeSqlForCanvas = (sql: string): string => {
  const normalized = sql.replace(
    /\bFETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi,
    'LIMIT $1',
  );
  if (/\bFETCH\b/i.test(normalized)) {
    throw new Error('FETCH clauses other than FETCH FIRST/NEXT ... ROWS ONLY are not supported for canvas import.');
  }
  return normalized;
};

const mapSelect = (
  select: Select,
  template: QueryType,
  metadata: SqlCanvasMetadata,
  id: number,
  queryName: string,
): QueryType => {
  const ctes: CTEType[] = (select.with || []).map((cte, index) => {
    const cteName = cte.name.value;
    const cteStatement = readRecord(cte.stmt);
    const nestedAstCandidate = cteStatement?.ast;
    const nestedAst = isSelectAst(nestedAstCandidate) ? nestedAstCandidate : cte.stmt;
    if (!isSelectAst(nestedAst)) {
      throw new Error(`The CTE "${cteName}" does not contain a supported SELECT query.`);
    }
    const nested = mapSelect(nestedAst, template, metadata, -1, cteName);
    return {
      id: `cte-${index + 1}-${cteName}`,
      name: cteName,
      query: nested,
    };
  });
  const { tables, joins } = mapFromTables(select, metadata, ctes);
  const selectedColumns = select.columns
    .flatMap((column, index) => {
      const record = readRecord(column);
      const reference = readColumnReference(record?.expr);
      if (reference?.column === '*' && !reference.table && tables.length > 1) {
        return tables.map((table, tableIndex) =>
          mapSelectExpression(record?.expr, record?.as, tables, index + tableIndex + 1, metadata, table),
        );
      }
      return [mapSelectExpression(record?.expr, record?.as, tables, index + 1, metadata)];
    })
    .filter((column) => column.column_name !== '')
    .map((column, index) => ({ ...column, id: index + 1 }));
  const columns = applyWhereConditions(
    select.having,
    applyWhereConditions(select.where, selectedColumns, tables, metadata),
    tables,
    metadata,
    true,
  );
  const limit = readRecord(select.limit);
  const limitValues = limit && Array.isArray(limit.value) ? limit.value : [];
  const offset = readString(limit?.seperator).toLowerCase() === 'offset';
  if (offset) {
    throw new Error('OFFSET clauses are not supported for canvas import.');
  }
  const limitExpression = readRecord(limitValues[0]);
  const parsedLimit = limitExpression?.type === 'number' ? Number(limitExpression.value) : null;
  if (limitValues.length > 0 && (parsedLimit === null || !Number.isSafeInteger(parsedLimit) || parsedLimit < 0)) {
    throw new Error('Only numeric LIMIT values are supported for canvas import.');
  }
  const query: QueryType = {
    ...template,
    id,
    queryName,
    queryType: 'SELECT',
    limit: parsedLimit !== null,
    limitValue: parsedLimit ?? template.limitValue,
    activeTab: 'main',
    tables,
    columns,
    joins,
    ctes,
    where: [],
    mainQueryBackup: null,
    selectStateBackup: null,
    sets: [],
    using: [],
    lastTableId: tables.length,
    lastColumnId: columns.length,
    sql: '',
    result: null,
    error: null,
    querying: false,
  };
  return query;
};

export const mapSqlAstToQueryState = (
  ast: AST | AST[],
  template: QueryType,
  metadata: SqlCanvasMetadata,
): QueryType => {
  const statements = Array.isArray(ast) ? ast : [ast];
  if (statements.length !== 1 || !isSelect(statements[0])) {
    throw new Error('Only a single SELECT statement can currently be applied to the canvas.');
  }
  return mapSelect(statements[0], template, metadata, template.id, template.queryName);
};
