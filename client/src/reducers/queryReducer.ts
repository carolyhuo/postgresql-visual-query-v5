import _ from 'lodash';
import randomColor from 'randomcolor';
import {
  ADD_COLUMN,
  ADD_CTE,
  ADD_JOIN,
  ADD_RESULT_FULFILLED,
  ADD_SET,
  ADD_TABLE,
  CHANGE_QUERY_TYPE,
  DELETE_QUERY,
  RESET_QUERY,
  GENERATE_SQL,
  QUERYING,
  REMOVE_COLUMN,
  REMOVE_CTE,
  REMOVE_JOIN,
  REMOVE_SET,
  REMOVE_TABLE,
  SET_ACTIVE_QUERY,
  SET_LIMIT_VALUE,
  SWITCH_DISTINCT,
  SWITCH_RETURNING,
  SWITCH_FROM_QUERY,
  UPDATE_FROM_QUERY,
  SWITCH_LIMIT,
  SWITCH_TIES,
  UPDATE_COLUMN,
  UPDATE_COLUMN_OPERAND,
  UPDATE_COLUMNS_ORDER,
  UPDATE_JOIN,
  UPDATE_JOIN_NEW_TABLE,
  UPDATE_JOINS_ORDER,
  UPDATE_SET,
  UPDATE_SETS_ORDER,
  UPDATE_SQL,
  UPDATE_TABLE,
  UPDATE_VALIDITY,
  ADD_ROWS,
  REMOVE_ROWS,
  ADD_USING,
  UPDATE_USING,
  REMOVE_USING,
  CHANGE_DEFAULT_VALUE,
  ADD_FILTER_ROW,
  REMOVE_FILTER_ROW,
  UPDATE_COLUMN_FILTER,
} from '../actions/queryActions';
import { buildQuery, buildDeleteQuery, buildInsertQuery, buildUpdateQuery } from '../utils/queryBuilder';
import { QueryType } from '../types/queryTypes';
import { QueryActions } from '../types/actions/queryActionTypes';
import { Reducer } from 'redux';
import { createEmptyColumn } from '../utils/columnUtils';

export const INITIAL_STATE: QueryType = {
  id: 0,
  columns: [],
  queryType: 'SELECT',
  tables: [],
  distinct: false,
  returning: false,
  limit: false,
  limitValue: 50,
  withTies: false,
  sql: '',
  result: null,
  joins: [],
  using: [],
  error: null,
  lastColumnId: 0,
  lastTableId: 0,
  querying: false,
  queryName: 'Main',
  queryValid: true,
  sets: [],
  rows: 1,
  filterRows: 1,
  isDragAndDrop: true,
  fromQuery: false,
  subqueryId: 0,
  subquerySql: '',
  defaultValue: 'DEFAULT',
};

export const queryReducer: Reducer<QueryType, QueryActions> = (state = INITIAL_STATE, action: QueryActions) => {
  switch (action.type) {
    case SET_ACTIVE_QUERY: {
      const activeQuery = _.cloneDeep(action.payload);
      const { queryName } = activeQuery;

      return {
        ...state,
        ...activeQuery,
        queryName,
      };
    }
    case ADD_CTE: {
      const cteQuery = {
        ..._.cloneDeep(INITIAL_STATE),
        id: -1,
        queryName: action.payload.name,
      };

      return {
        ...state,
        ctes: [
          ...(state.ctes || []),
          {
            ...action.payload,
            query: cteQuery,
          },
        ],
      };
    }
    case REMOVE_CTE: {
      return {
        ...state,
        ctes: (state.ctes || []).filter((cte) => cte.id !== action.payload),
      };
    }
    case ADD_COLUMN: {
      const baseColumn = _.cloneDeep(action.payload);

      // Find existing columns with the same name
      const existingColumns = state.columns.filter(
        (stateColumn) => stateColumn.column_name === action.payload.column_name,
      );

      // Set alias if there are existing columns with the same name
      let columnAlias = '';
      if (existingColumns.length > 0) {
        columnAlias = `${baseColumn.column_name}_${existingColumns.length + 1}`;
      }

      // Create column using utility function with specific overrides
      const column = createEmptyColumn({
        ...baseColumn,
        id: state.lastColumnId + 1,
        column_name: action.payload.column_name,
        column_name_original: action.payload.column_name,
        column_alias: columnAlias,
        column_filters: Array.from({ length: state.filterRows }, (_, index) => ({ id: index, filter: '' })),
        column_values: Array.from({ length: state.rows }, (_, index) => ({ id: index, value: state.defaultValue })),
      });

      // Handle column alias for copies
      const copies = state.columns.filter(
        (stateColumn) =>
          _.isEqual(stateColumn.table_name, column.table_name) &&
          _.isEqual(stateColumn.table_schema, column.table_schema) &&
          _.isEqual(stateColumn.column_name, column.column_name),
      );

      let largestCopy = 0;

      copies.forEach((copy) => {
        if (_.includes(copy.column_alias, `${column.column_name}_`, 0)) {
          const numb = copy.column_alias.replace(/[^0-9]/g, '');

          if (parseInt(numb, 10) > largestCopy) {
            largestCopy = parseInt(numb, 10);
          }
        }
      });

      if (copies.length > 0 && largestCopy === 0) {
        column.column_alias = `${column.column_name}_1`;
      }

      if (largestCopy > 0) {
        const index = largestCopy + 1;
        column.column_alias = `${column.column_name}_${index}`;
      }

      return {
        ...state,
        columns: [...state.columns, column],
        lastColumnId: column.id,
      };
    }
    case CHANGE_QUERY_TYPE: {
      return {
        ...state,
        queryType: action.payload,
      };
    }
    case CHANGE_DEFAULT_VALUE: {
      return {
        ...state,
        defaultValue: state.defaultValue === 'DEFAULT' ? 'NULL' : 'DEFAULT',
      };
    }
    case ADD_ROWS: {
      const columns = _.cloneDeep(state.columns);
      columns.forEach((column) => {
        column.column_values.push({ id: state.rows, value: state.defaultValue });
      });

      return {
        ...state,
        columns,
        rows: state.rows + 1,
      };
    }
    case REMOVE_ROWS: {
      if (state.rows > 1) {
        const columns = _.cloneDeep(state.columns);
        columns.forEach((column) => {
          column.column_values.splice(-1);
        });

        return {
          ...state,
          columns,
          rows: state.rows - 1,
        };
      }
      return {
        ...state,
      };
    }
    case ADD_FILTER_ROW: {
      const columns = _.cloneDeep(state.columns);
      columns.forEach((column) => {
        column.column_filters.push({ id: state.filterRows, filter: '' });
      });

      return {
        ...state,
        columns,
        filterRows: state.filterRows + 1,
      };
    }
    case REMOVE_FILTER_ROW: {
      if (state.filterRows > 1) {
        const columns = _.cloneDeep(state.columns);
        columns.forEach((column) => {
          column.column_filters.splice(-1);
        });

        return {
          ...state,
          columns,
          filterRows: state.filterRows - 1,
        };
      }

      return {
        ...state,
      };
    }
    case UPDATE_COLUMN_FILTER: {
      return {
        ...state,
        columns: state.columns.map((column) => {
          if (column.id === action.payload.columnId) {
            return {
              ...column,
              column_filters: column.column_filters.map((filter) => {
                if (filter.id === action.payload.filterId) {
                  return {
                    ...filter,
                    filter: action.payload.filter,
                  };
                }
                return filter;
              }),
            };
          }
          return column;
        }),
      };
    }
    case UPDATE_FROM_QUERY: {
      const subQuery = action.payload;

      return {
        ...state,
        subqueryId: subQuery.subqueryId,
        subquerySql: subQuery.subquerySql,
      };
    }
    case UPDATE_COLUMN: {
      const updatedColumn = action.payload;
      return {
        ...state,
        columns: state.columns.map((column) => (_.isEqual(column.id, updatedColumn.id) ? updatedColumn : column)),
      };
    }
    case UPDATE_COLUMN_OPERAND: {
      return {
        ...state,
        columns: state.columns.map((column) =>
          column.id === action.payload.id
            ? {
                ...column,
                column_filter_operand: action.payload.operand,
              }
            : column,
        ),
      };
    }
    case REMOVE_COLUMN: {
      const removableColumn = action.payload;

      const filteredColumns = state.columns.filter(
        (column) => !(_.isEqual(column.table_id, removableColumn.table_id) && _.isEqual(column.id, removableColumn.id)),
      );

      if (filteredColumns.length) {
        filteredColumns[filteredColumns.length - 1].column_filter_operand = '';
      }

      return {
        ...state,
        columns: filteredColumns,
      };
    }
    case UPDATE_COLUMNS_ORDER: {
      return {
        ...state,
        columns: action.payload,
      };
    }
    case ADD_TABLE: {
      const table = _.cloneDeep(action.payload);

      table.id = state.lastTableId + 1;
      table.table_alias = '';

      const tablesCount = state.tables.length;
      const copies = state.tables.filter(
        (stateTable) =>
          _.isEqual(stateTable.table_name, table.table_name) && _.isEqual(stateTable.table_schema, table.table_schema),
      );

      let largestCopy = 0;

      copies.forEach((copy) => {
        if (_.includes(copy.table_alias, `${table.table_name}_`, 0)) {
          const numb = copy.table_alias.replace(/[^0-9]/g, '');

          if (parseInt(numb, 10) > largestCopy) {
            largestCopy = parseInt(numb, 10);
          }
        }
      });

      if (copies.length > 0 && largestCopy === 0) {
        table.table_alias = `${table.table_name}_1`;
      }

      if (largestCopy > 0) {
        const index = largestCopy + 1;
        table.table_alias = `${table.table_name}_${index}`;
      }

      table.selectIndex = tablesCount;

      return {
        ...state,
        tables: [...state.tables, table],
        lastTableId: table.id,
      };
    }
    case REMOVE_TABLE: {
      const removableTable = action.payload;
      const filteredTables = state.tables.filter((table) => !_.isEqual(table.id, removableTable.id));
      const filteredColumns = state.columns.filter((column) => !_.isEqual(column.table_id, removableTable.id));

      // Remove any joins where this table is either the main table or referenced in any condition as secondary table
      const filteredJoins = state.joins.filter((join) => {
        // Filter out if this is the main table
        if (_.isEqual(join.main_table.id, removableTable.id)) {
          return false;
        }

        // Filter out if this table is referenced in any condition as secondary table
        return !join.conditions.some((condition) => _.isEqual(condition.secondary_table.id, removableTable.id));
      });

      const filteredUsing = state.using.filter((using) => !_.isEqual(using.main_table.id, removableTable.id));

      return {
        ...state,
        columns: filteredColumns,
        tables: filteredTables,
        joins: filteredJoins,
        using: filteredUsing,
      };
    }
    case UPDATE_TABLE: {
      const updatedTable = action.payload;
      const tableIndex = state.tables.findIndex((table) => _.isEqual(table.id, updatedTable.id));
      const tables = _.cloneDeep(state.tables);

      if (tableIndex > -1) {
        tables[tableIndex] = updatedTable;
      }

      // Create immutable copies of columns with updated table_alias
      const updatedColumns = state.columns.map((column) => {
        if (_.isEqual(column.table_id, updatedTable.id)) {
          return {
            ...column,
            table_alias: updatedTable.table_alias,
          };
        }
        return column;
      });

      // Create immutable copies of joins with updated table_alias
      const updatedJoins = state.joins.map((join) => {
        const joinCopy = { ...join };
        let needsUpdate = false;

        // If this join's main table is being updated
        if (_.isEqual(join.main_table.id, updatedTable.id)) {
          joinCopy.main_table = {
            ...join.main_table,
            table_alias: updatedTable.table_alias,
          };
          needsUpdate = true;
        }

        // Check all conditions for secondary table references
        const updatedConditions = join.conditions.map((condition) => {
          if (_.isEqual(condition.secondary_table.id, updatedTable.id)) {
            needsUpdate = true;
            return {
              ...condition,
              secondary_table: {
                ...condition.secondary_table,
                table_alias: updatedTable.table_alias,
              },
            };
          }
          return condition;
        });

        // Only create a new object if needed
        if (needsUpdate) {
          joinCopy.conditions = updatedConditions;
          return joinCopy;
        }

        return join;
      });

      return {
        ...state,
        columns: updatedColumns,
        tables,
        joins: updatedJoins,
      };
    }
    case SWITCH_DISTINCT: {
      return {
        ...state,
        distinct: !state.distinct,
      };
    }
    case SWITCH_RETURNING: {
      return {
        ...state,
        returning: !state.returning,
      };
    }
    case SWITCH_FROM_QUERY: {
      return {
        ...state,
        fromQuery: !state.fromQuery,
      };
    }
    case SWITCH_LIMIT: {
      return {
        ...state,
        limit: !state.limit,
      };
    }
    case SWITCH_TIES: {
      return {
        ...state,
        withTies: !state.withTies,
      };
    }
    case SET_LIMIT_VALUE: {
      return {
        ...state,
        limitValue: action.payload,
      };
    }
    case ADD_USING: {
      let id = 0;

      if (state.using.length > 0) {
        id = state.using[state.using.length - 1].id + 1;
      }

      const usingTable = {
        id,
        main_table: {
          id: 0,
          table_name: '',
          table_schema: '',
          table_alias: '',
        },
        conditions: [],
      };

      return {
        ...state,
        using: [...state.using, usingTable],
      };
    }
    case UPDATE_USING: {
      const using = _.cloneDeep(state.using);

      if (action.payload.newTable) {
        const table = _.cloneDeep(action.payload.using.main_table);

        table.id = state.lastTableId + 1;
        table.table_alias = '';

        const copies = state.tables.filter(
          (stateTable) =>
            _.isEqual(stateTable.table_name, table.table_name) &&
            _.isEqual(stateTable.table_schema, table.table_schema),
        );

        let largestCopy = 0;

        copies.forEach((copy) => {
          if (_.includes(copy.table_alias, `${table.table_name}_`, 0)) {
            const numb = copy.table_alias.replace(/[^0-9]/g, '');

            if (parseInt(numb, 10) > largestCopy) {
              largestCopy = parseInt(numb, 10);
            }
          }
        });

        if (copies.length > 0 && largestCopy === 0) {
          table.table_alias = `${table.table_name}_1`;
        }

        if (largestCopy > 0) {
          const index = largestCopy + 1;
          table.table_alias = `${table.table_name}_${index}`;
        }

        if (action.payload.using.id > -1 && action.payload.using.id < state.using.length) {
          using[action.payload.using.id] = action.payload.using;
        }

        return {
          ...state,
          lastTableId: table.id,
          tables: [...state.tables, table],
          using,
        };
      }

      if (action.payload.using.id > -1 && action.payload.using.id < state.using.length) {
        using[action.payload.using.id] = action.payload.using;

        return {
          ...state,
          using,
        };
      }
      return {
        ...state,
        using,
      };
    }
    case REMOVE_USING: {
      const filteredUsing = state.using.filter((using) => using.id !== action.payload.id);

      return {
        ...state,
        using: filteredUsing,
      };
    }
    case ADD_JOIN: {
      let id = 0;

      if (state.joins.length > 0) {
        id = state.joins[state.joins.length - 1].id + 1;
      }

      const join = {
        id,
        type: 'inner',
        color: randomColor({
          luminosity: 'bright',
        }),
        main_table: {
          table_name: '',
          table_schema: '',
          table_alias: '',
        },
        conditions: [],
      };

      return {
        ...state,
        joins: [...state.joins, join],
        isDragAndDrop: action.payload.isDragAndDrop,
      };
    }
    case UPDATE_JOIN: {
      const joins = _.cloneDeep(state.joins);

      if (action.payload.id > -1 && action.payload.id < state.joins.length) {
        const updatedJoin = action.payload;

        // Identify which tables are involved
        const mainTableKey = `${updatedJoin.main_table.table_schema}.${updatedJoin.main_table.table_name}.${updatedJoin.main_table.table_alias || ''}`;
        const secondaryTableKey =
          updatedJoin.conditions.length > 0
            ? `${updatedJoin.conditions[0].secondary_table.table_schema}.${updatedJoin.conditions[0].secondary_table.table_name}.${updatedJoin.conditions[0].secondary_table.table_alias || ''}`
            : null;

        if (secondaryTableKey) {
          const involvedTablesSorted = [mainTableKey, secondaryTableKey].sort().join('::');

          // Update the type for ALL joins between these two tables
          joins.forEach((join) => {
            if (join.conditions.length > 0) {
              const currentMainKey = `${join.main_table.table_schema}.${join.main_table.table_name}.${join.main_table.table_alias || ''}`;
              const currentSecondaryKey = `${join.conditions[0].secondary_table.table_schema}.${join.conditions[0].secondary_table.table_name}.${join.conditions[0].secondary_table.table_alias || ''}`;
              const currentPairKey = [currentMainKey, currentSecondaryKey].sort().join('::');

              if (currentPairKey === involvedTablesSorted) {
                join.type = updatedJoin.type; // Apply the same type to all
              }
            }
          });
        }

        // Replace the updated join as usual
        joins[updatedJoin.id] = updatedJoin;
      }

      return {
        ...state,
        joins,
      };
    }
    case UPDATE_JOIN_NEW_TABLE: {
      const table = _.cloneDeep(action.payload.main_table);

      table.id = state.lastTableId + 1;
      table.table_alias = '';

      const copies = state.tables.filter(
        (stateTable) =>
          _.isEqual(stateTable.table_name, table.table_name) && _.isEqual(stateTable.table_schema, table.table_schema),
      );

      let largestCopy = 0;

      copies.forEach((copy) => {
        if (_.includes(copy.table_alias, `${table.table_name}_`, 0)) {
          const numb = copy.table_alias.replace(/[^0-9]/g, '');

          if (parseInt(numb, 10) > largestCopy) {
            largestCopy = parseInt(numb, 10);
          }
        }
      });

      if (copies.length > 0 && largestCopy === 0) {
        table.table_alias = `${table.table_name}_1`;
      }

      if (largestCopy > 0) {
        const index = largestCopy + 1;
        table.table_alias = `${table.table_name}_${index}`;
      }

      const joins = _.cloneDeep(state.joins);

      if (action.payload.id > -1 && action.payload.id < state.joins.length) {
        joins[action.payload.id] = action.payload;
      }

      return {
        ...state,
        tables: [...state.tables, table],
        lastTableId: table.id,
        joins,
      };
    }
    case REMOVE_JOIN: {
      const filteredJoins = state.joins
        .filter((join) => join.id !== action.payload.id)
        .map((join, index) => ({
          ...join,
          id: index,
        }));

      return {
        ...state,
        joins: filteredJoins,
      };
    }

    case ADD_RESULT_FULFILLED: {
      // Limit number of rows kept in Redux state to prevent performance issues
      // Store only the first 1000 rows in state, but keep the total count
      const result = action.payload;

      if (result && result.rows && result.rows.length > 1000) {
        // Create a copy with limited rows but preserve metadata
        const limitedResult = {
          ...result,
          fullRowCount: result.rowCount, // Store the actual total count
          rows: result.rows.slice(0, 1000), // Keep only first 1000 rows in Redux state
          rowCount: result.rows.length, // Original row count
          hasMoreRows: true, // Flag indicating there are more rows
        };

        return {
          ...state,
          result: limitedResult,
          error: null,
          querying: false,
        };
      }

      return {
        ...state,
        result: result,
        error: null,
        querying: false,
      };
    }
    case UPDATE_JOINS_ORDER: {
      return {
        ...state,
        joins: action.payload,
      };
    }
    case DELETE_QUERY: {
      return INITIAL_STATE;
    }
    case RESET_QUERY: {
      return {
        ...INITIAL_STATE,
        id: state.id,
        queryType: action.payload,
      };
    }
    case GENERATE_SQL: {
      try {
        if (state.queryType === 'SELECT') {
          const selectSql = buildQuery({ data: state, queries: action.payload.queries });
          return {
            ...state,
            sql: selectSql,
            error: null,
          };
        }
        if (state.queryType === 'DELETE') {
          const deleteSql = buildDeleteQuery(state);
          return {
            ...state,
            sql: deleteSql,
            error: null,
          };
        }
        if (state.queryType === 'INSERT') {
          const insertSql = buildInsertQuery(state);
          return {
            ...state,
            sql: insertSql,
            error: null,
          };
        }
        if (state.queryType === 'UPDATE') {
          const updateSql = buildUpdateQuery(state);
          return {
            ...state,
            sql: updateSql,
            error: null,
          };
        }
        return state;
      } catch (error) {
        console.error('Error generating SQL:', error);
        return {
          ...state,
          sql: '',
          error: error instanceof Error ? error.message : 'An error occurred while generating the query',
        };
      }
    }
    case UPDATE_SQL: {
      return {
        ...state,
        sql: action.payload,
      };
    }
    case `ADD_RESULT_REJECTED`: {
      return {
        ...state,
        error: action.payload,
        result: null,
        querying: false,
      };
    }
    case QUERYING: {
      return {
        ...state,
        querying: true,
      };
    }
    case UPDATE_VALIDITY: {
      return {
        ...state,
        queryValid: action.payload.isValid,
      };
    }
    case ADD_SET: {
      let id = 0;

      if (state.sets.length > 0) {
        id = state.sets[state.sets.length - 1].id + 1;
      }

      const set = {
        id,
        type: 'union',
        color: randomColor({
          luminosity: 'bright',
        }),
        subquerySql: '',
        subqueryId: 0,
      };

      return {
        ...state,
        sets: [...state.sets, set],
      };
    }
    case UPDATE_SET: {
      const sets = _.cloneDeep(state.sets);

      if (action.payload.id > -1 && action.payload.id < state.sets.length) {
        sets[action.payload.id] = action.payload;
      }

      return {
        ...state,
        sets,
      };
    }
    case REMOVE_SET: {
      const filteredSets = state.sets.filter((set) => set.id !== action.payload.id);

      return {
        ...state,
        sets: filteredSets,
      };
    }
    case UPDATE_SETS_ORDER: {
      return {
        ...state,
        sets: action.payload,
      };
    }
    default:
      return state;
  }
};
