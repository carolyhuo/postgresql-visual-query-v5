import { Parser } from 'node-sql-parser';
import { INITIAL_STATE } from '../../reducers/queryReducer';
import { mapSqlAstToQueryState, normalizeSqlForCanvas } from '../../utils/sqlToCanvas';
import { buildQuery } from '../../utils/queryBuilder';

describe('mapSqlAstToQueryState', () => {
  test('maps SELECT tables, joins, CTE subqueries, and window function settings', () => {
    const sql = `
      WITH city_summary AS (
        SELECT city.countrycode, SUM(city.population) AS large_cities_population
        FROM public.city
      )
      SELECT country.continent,
        DENSE_RANK() OVER (
          PARTITION BY country.continent
          ORDER BY city_summary.large_cities_population DESC
        ) AS continent_rank
      FROM public.country
      INNER JOIN city_summary ON country.code = city_summary.countrycode
    `;
    const metadata = {
      tables: [
        { table_name: 'city', table_schema: 'public', table_type: 'BASE TABLE' },
        { table_name: 'country', table_schema: 'public', table_type: 'BASE TABLE' },
      ],
      columns: [
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'countrycode',
          data_type: 'text',
          ordinal_position: 1,
        },
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'population',
          data_type: 'integer',
          ordinal_position: 2,
        },
        {
          table_name: 'country',
          table_schema: 'public',
          column_name: 'continent',
          data_type: 'text',
          ordinal_position: 1,
        },
        { table_name: 'country', table_schema: 'public', column_name: 'code', data_type: 'text', ordinal_position: 2 },
      ],
      constraints: [],
    };

    const query = mapSqlAstToQueryState(new Parser().astify(sql, { database: 'Postgresql' }), INITIAL_STATE, metadata);

    expect(query.tables.map((table) => [table.table_name, table.table_type])).toEqual([
      ['country', 'BASE TABLE'],
      ['city_summary', 'CTE'],
    ]);
    expect(query.columns.map(({ column_alias }) => column_alias)).toEqual(['', 'continent_rank']);
    expect(query.joins).toHaveLength(1);
    expect(query.joins[0].conditions[0]).toMatchObject({
      main_column: 'code',
      secondary_column: 'countrycode',
    });
    expect(query.ctes).toHaveLength(1);
    expect(query.ctes[0].query.columns[1]).toMatchObject({
      column_name: 'population',
      column_aggregate: 'SUM',
      column_alias: 'large_cities_population',
    });
    expect(query.columns[1]).toMatchObject({
      is_window_function: true,
      window_function_name: 'DENSE_RANK',
      window_partition_by: '"country"."continent"',
      window_order_by: '"city_summary"."large_cities_population" DESC',
    });
  });

  test('preserves arguments for LAG and LEAD window functions in main queries and CTEs', () => {
    const metadata = {
      tables: [{ table_name: 'city', table_schema: 'public', table_type: 'BASE TABLE' }],
      columns: [
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'population',
          data_type: 'integer',
          ordinal_position: 1,
        },
      ],
      constraints: [],
    };
    const sql = `
      WITH city_lags AS (
        SELECT LAG(population) OVER (ORDER BY population) AS previous_population
        FROM public.city
      )
      SELECT LEAD(population) OVER (ORDER BY population) AS next_population
      FROM public.city
    `;
    const query = mapSqlAstToQueryState(
      new Parser().astify(sql, { database: 'Postgresql' }),
      INITIAL_STATE,
      metadata,
    );
    const generatedSql = buildQuery({ data: query, queries: [] });

    expect(query.columns[0]).toMatchObject({
      window_function_name: 'LEAD',
      window_function_arguments: '"city"."population"',
    });
    expect(query.ctes[0].query.columns[0]).toMatchObject({
      window_function_name: 'LAG',
      window_function_arguments: '"city"."population"',
    });
    expect(generatedSql).toContain('LEAD("city"."population") OVER');
    expect(generatedSql).toContain('LAG("city"."population") OVER');
    expect(generatedSql).not.toContain('LAG()');
    expect(generatedSql).not.toContain('LEAD()');
  });

  test('imports FETCH FIRST queries and preserves the row limit', () => {
    const sql = `SELECT
DISTINCT
RANK() OVER (PARTITION BY "city"."countrycode" ORDER BY "city"."population" DESC) AS rank_result,
ROW_NUMBER() OVER (PARTITION BY "city"."population") AS row_number_result
FROM public.city
FETCH FIRST 50 ROWS ONLY;`;
    const ast = new Parser().astify(normalizeSqlForCanvas(sql), { database: 'Postgresql' });
    const query = mapSqlAstToQueryState(ast, INITIAL_STATE, { tables: [], columns: [], constraints: [] });

    expect(query.limit).toBe(true);
    expect(query.limitValue).toBe(50);
    expect(buildQuery({ data: query, queries: [] })).toContain('FETCH FIRST 50 ROWS ONLY;');
  });

  test('rejects unsupported FETCH WITH TIES rather than dropping its semantics', () => {
    expect(() => normalizeSqlForCanvas('SELECT name FROM city FETCH FIRST 5 ROWS WITH TIES')).toThrow(
      'FETCH clauses other than FETCH FIRST/NEXT ... ROWS ONLY are not supported for canvas import.',
    );
  });

  test('rejects unsupported statements instead of replacing the canvas', () => {
    const ast = new Parser().astify('DELETE FROM city', { database: 'Postgresql' });

    expect(() => mapSqlAstToQueryState(ast, INITIAL_STATE, { tables: [], columns: [], constraints: [] })).toThrow(
      'Only a single SELECT statement can currently be applied to the canvas.',
    );
  });

  test('maps WHERE criteria onto the matching selected column', () => {
    const metadata = {
      tables: [{ table_name: 'city', table_schema: 'public', table_type: 'BASE TABLE' }],
      columns: [
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'population',
          data_type: 'integer',
          ordinal_position: 1,
        },
      ],
      constraints: [],
    };
    const ast = new Parser().astify('SELECT population FROM public.city WHERE population > 2000000', {
      database: 'Postgresql',
    });

    const query = mapSqlAstToQueryState(ast, INITIAL_STATE, metadata);

    expect(query.columns[0].column_conditions[0]).toBe('> 2000000');
  });

  test('maps HAVING criteria onto aggregate columns inside CTEs', () => {
    const metadata = {
      tables: [{ table_name: 'city', table_schema: 'public', table_type: 'BASE TABLE' }],
      columns: [
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'population',
          data_type: 'integer',
          ordinal_position: 1,
        },
      ],
      constraints: [],
    };
    const ast = new Parser().astify(
      'WITH city_summary AS (SELECT SUM(population) AS total FROM public.city HAVING SUM(population) > 500000) SELECT total FROM city_summary',
      { database: 'Postgresql' },
    );

    const query = mapSqlAstToQueryState(ast, INITIAL_STATE, metadata);
    const aggregateColumn = query.ctes[0].query.columns.find((column) => column.column_aggregate === 'SUM');

    expect(aggregateColumn).toMatchObject({
      column_name: 'population',
      column_alias: 'total',
      column_conditions: ['> 500000'],
    });
  });

  test('adds WHERE-only columns to the canvas without selecting them', () => {
    const metadata = {
      tables: [{ table_name: 'city', table_schema: 'public', table_type: 'BASE TABLE' }],
      columns: [
        { table_name: 'city', table_schema: 'public', column_name: 'name', data_type: 'text', ordinal_position: 1 },
        {
          table_name: 'city',
          table_schema: 'public',
          column_name: 'population',
          data_type: 'integer',
          ordinal_position: 2,
        },
      ],
      constraints: [],
    };
    const ast = new Parser().astify("SELECT name FROM public.city WHERE population > 2000000 AND name = 'Tallinn'", {
      database: 'Postgresql',
    });

    const query = mapSqlAstToQueryState(ast, INITIAL_STATE, metadata);
    const population = query.columns.find((column) => column.column_name === 'population');
    const name = query.columns.find((column) => column.column_name === 'name');

    expect(population).toMatchObject({
      display_in_query: false,
      column_conditions: ['> 2000000', ''],
    });
    expect(name.column_conditions[0]).toBe("= 'Tallinn'");
  });

  test('replaces stale canvas tables, joins, and CTEs when importing a new query', () => {
    const metadata = {
      tables: [{ table_name: 'country', table_schema: 'public', table_type: 'BASE TABLE' }],
      columns: [
        { table_name: 'country', table_schema: 'public', column_name: 'name', data_type: 'text', ordinal_position: 1 },
      ],
      constraints: [],
    };
    const staleQuery = {
      ...INITIAL_STATE,
      tables: [{ id: 99, table_name: 'old_table', table_schema: 'public', columns: [] }],
      columns: [{ id: 99, table_name: 'old_table', column_name: 'old_column', column_conditions: [] }],
      joins: [{ id: 99, conditions: [] }],
      ctes: [{ id: 'old-cte', name: 'old_cte', query: INITIAL_STATE }],
    };
    const ast = new Parser().astify('SELECT name FROM public.country', { database: 'Postgresql' });

    const query = mapSqlAstToQueryState(ast, staleQuery, metadata);

    expect(query.tables.map((table) => table.table_name)).toEqual(['country']);
    expect(query.columns.map((column) => column.column_name)).toEqual(['name']);
    expect(query.joins).toEqual([]);
    expect(query.ctes).toEqual([]);
    expect(query.where).toEqual([]);
  });
});
