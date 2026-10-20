import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { performance } from 'perf_hooks';
import { Pool, PoolClient } from 'pg';
import { Parser } from 'node-sql-parser';
import { mapSqlAstToQueryState } from '../utils/sqlToCanvas';
import { buildQuery } from '../utils/queryBuilder';
import { QueryType } from '../types/queryTypes';
import { VALIDATION_QUERIES, ValidationQuery } from './testQueries';

interface ValidationResult {
  id: number;
  category: ValidationQuery['category'];
  title: string;
  syntaxValid: boolean;
  semanticEquivalent: boolean | null;
  executionTimeMs: number | null;
  status: 'PASS' | 'SYNTAX_FAIL' | 'SEMANTIC_FAIL' | 'DATABASE_ERROR';
  error?: string;
}

const parser = new Parser();
const metadata = { tables: [], columns: [], constraints: [] };

const createQueryTemplate = (): QueryType => ({
  id: 0,
  activeTab: 'main',
  columns: [],
  ctes: [],
  defaultValue: 'DEFAULT',
  distinct: false,
  error: null,
  filterRows: 1,
  fromQuery: false,
  isDragAndDrop: true,
  joins: [],
  lastColumnId: 0,
  lastTableId: 0,
  limit: false,
  limitValue: 50,
  mainQueryBackup: null,
  querying: false,
  queryName: 'Validation',
  queryType: 'SELECT',
  queryValid: true,
  result: null,
  returning: false,
  rows: 1,
  sets: [],
  sql: '',
  subqueryId: 0,
  subquerySql: '',
  tables: [],
  using: [],
  withTies: false,
});

const normalizeSql = (sql: string): string => sql.trim().replace(/;+$/, '');

const escapeMarkdown = (value: string): string => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const parseAndGenerate = (sql: string): string => {
  const ast = parser.astify(sql, { database: 'Postgresql' });
  const state = mapSqlAstToQueryState(ast, createQueryTemplate(), metadata);
  const generatedSql = buildQuery({ data: state, queries: [] });
  if (!generatedSql.trim()) {
    throw new Error('SQL generation returned an empty query.');
  }
  const generatedAst = parser.astify(generatedSql, { database: 'Postgresql' });
  if (Array.isArray(generatedAst) && generatedAst.length !== 1) {
    throw new Error('Generated SQL contains multiple statements.');
  }
  return generatedSql;
};

const compareSemantics = async (
  client: PoolClient,
  originalSql: string,
  generatedSql: string,
): Promise<{ equivalent: boolean; elapsedMs: number }> => {
  const original = normalizeSql(originalSql);
  const generated = normalizeSql(generatedSql);
  const comparisonSql = `
    SELECT count(*) AS diff_count
    FROM (
      (${original}) EXCEPT ALL (${generated})
      UNION ALL
      (${generated}) EXCEPT ALL (${original})
    ) AS diff_table
  `;
  const start = performance.now();
  const result = await client.query<{ diff_count: string }>(comparisonSql);
  return {
    equivalent: Number(result.rows[0].diff_count) === 0,
    elapsedMs: performance.now() - start,
  };
};

const createReport = (results: ValidationResult[]): string => {
  const total = results.length;
  const syntaxPassed = results.filter((result) => result.syntaxValid).length;
  const semanticPassed = results.filter((result) => result.semanticEquivalent).length;
  const semanticPassRate = `${semanticPassed}/${total} (${total ? ((semanticPassed / total) * 100).toFixed(1) : '0.0'}%)`;
  const rows = results.map((result) => {
    const executionTime = result.executionTimeMs === null ? 'N/A' : `${result.executionTimeMs.toFixed(2)} ms`;
    const semanticStatus =
      result.semanticEquivalent === null ? 'NOT RUN' : result.semanticEquivalent ? 'PASS (0)' : 'FAIL';
    return `| ${result.id} | ${result.category} | ${escapeMarkdown(result.title)} | ${result.syntaxValid ? 'PASS' : 'FAIL'} | ${semanticStatus} | ${executionTime} | ${result.status} |`;
  });
  const errors = results.filter((result) => result.error);
  const errorSection =
    errors.length > 0
      ? `\n## Errors\n\n${errors.map((result) => `- **${result.id}. ${escapeMarkdown(result.title)}**: ${escapeMarkdown(result.error || '')}`).join('\n')}\n`
      : '';

  return `# PostgreSQL Semantic Validation Results

Generated: ${new Date().toISOString()}

## Summary

- Total queries: ${total}
- Syntax pass rate: ${syntaxPassed}/${total} (${total ? ((syntaxPassed / total) * 100).toFixed(1) : '0.0'}%)
- Semantic pass rate: ${semanticPassRate}

## Results

| ID | Category | Query Title | Syntax Valid | Semantic Equivalence (EXCEPT = 0) | Execution Time | Status |
|---:|---|---|:---:|:---:|---:|---|
${rows.join('\n')}
${errorSection}`;
};

const createPool = (): Pool =>
  new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number.parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'world',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    connectionTimeoutMillis: 5000,
  });

const run = async (): Promise<void> => {
  if (typeof globalThis.sessionStorage === 'undefined') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: { getItem: () => null },
    });
  }

  const pool = createPool();
  let client: PoolClient | null = null;
  let connectionError: string | undefined;
  try {
    client = await pool.connect();
  } catch (error) {
    connectionError = `Unable to connect to PostgreSQL: ${errorMessage(error)}`;
    console.error(connectionError);
  }

  const results: ValidationResult[] = [];
  try {
    // This database work is intentionally sequential to keep progress and timings deterministic.
    // eslint-disable-next-line no-restricted-syntax
    for (let index = 0; index < VALIDATION_QUERIES.length; index += 1) {
      const validationQuery = VALIDATION_QUERIES[index];
      console.log(`[${index + 1}/${VALIDATION_QUERIES.length}] ${validationQuery.title}`);
      let generatedSql: string;
      try {
        generatedSql = parseAndGenerate(validationQuery.sql);
      } catch (error) {
        const message = errorMessage(error);
        results.push({
          id: validationQuery.id,
          category: validationQuery.category,
          title: validationQuery.title,
          syntaxValid: false,
          semanticEquivalent: null,
          executionTimeMs: null,
          status: 'SYNTAX_FAIL',
          error: message,
        });
        console.error(`  Syntax: FAIL — ${message}`);
        continue;
      }

      if (!client) {
        results.push({
          id: validationQuery.id,
          category: validationQuery.category,
          title: validationQuery.title,
          syntaxValid: true,
          semanticEquivalent: null,
          executionTimeMs: null,
          status: 'DATABASE_ERROR',
          error: connectionError,
        });
        console.log('  Syntax: PASS; semantic: DATABASE_ERROR');
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const comparison = await compareSemantics(client, validationQuery.sql, generatedSql);
        const result: ValidationResult = {
          id: validationQuery.id,
          category: validationQuery.category,
          title: validationQuery.title,
          syntaxValid: true,
          semanticEquivalent: comparison.equivalent,
          executionTimeMs: comparison.elapsedMs,
          status: comparison.equivalent ? 'PASS' : 'SEMANTIC_FAIL',
        };
        results.push(result);
        console.log(
          `  Syntax: PASS; semantic: ${comparison.equivalent ? 'PASS' : 'FAIL'}; ${comparison.elapsedMs.toFixed(2)} ms`,
        );
      } catch (error) {
        const message = errorMessage(error);
        results.push({
          id: validationQuery.id,
          category: validationQuery.category,
          title: validationQuery.title,
          syntaxValid: true,
          semanticEquivalent: null,
          executionTimeMs: null,
          status: 'DATABASE_ERROR',
          error: message,
        });
        console.error(`  Syntax: PASS; database: FAIL — ${message}`);
      }
    }
  } finally {
    client?.release();
    await pool.end();
  }

  const report = createReport(results);
  const reportPath = resolve(process.cwd(), 'src/validation/results.md');
  await writeFile(reportPath, report, 'utf8');
  console.log(`\nReport saved to ${reportPath}`);

  const passed = results.filter((result) => result.status === 'PASS').length;
  console.log(`Validation complete: ${passed}/${results.length} queries passed both checks.`);
  if (passed !== results.length) {
    process.exitCode = 1;
  }
};

run().catch((error: unknown) => {
  console.error(`Validation runner failed: ${errorMessage(error)}`);
  process.exitCode = 1;
});
