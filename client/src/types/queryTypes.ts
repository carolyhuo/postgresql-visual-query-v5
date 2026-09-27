export type QueryType = {
  columns: QueryColumnType[];
  defaultValue: string;
  distinct: boolean;
  error: string | null;
  filterRows: number;
  fromQuery: boolean;
  id: number;
  isDragAndDrop: boolean;
  joins: JoinType[];
  lastColumnId: number;
  lastTableId: number;
  limit: boolean;
  limitValue: number;
  queryType: string;
  queryValid: boolean;
  querying: boolean;
  queryName: string;
  result: any;
  returning: boolean;
  rows: number;
  sets: SetType[];
  sql: string;
  subqueryId: number;
  subquerySql: string;
  tables: QueryTableType[];
  using: UsingType[];
  withTies: boolean;
  ctes?: CTEType[];
};

export type ResultType = {
  command: string;
  fields: {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }[];
  oid: number | null;
  rowAsArray: boolean;
  rowCount: number;
  rows: any[];
};

export type SetType = {
  id: number;
  color: string;
  subqueryId: number;
  subquerySql: string;
  type: string;
};

export interface UsingCondition {
  id: number;
  secondary_table: {
    table_name: string;
    table_schema?: string;
    table_alias?: string;
  };
  secondary_column: string;
  main_column: string;
}

export type UsingType = {
  id: number;
  main_table: {
    id: number;
    table_name: string;
    table_schema: string;
    table_alias: string;
    columns?: Array<{ column_name: string; [key: string]: any }>;
  };
  conditions: UsingCondition[];
};

export type JoinType = {
  id: number;
  color: string;
  type: string;
  main_table: any;
  conditions: JoinConditionType[];
};

export type QueryTableType = {
  id: number;
  table_alias: string;
  table_name: string;
  table_schema: string;
  table_type: string;
  joinHandleSide?: 'left' | 'right';
  columns: QueryColumnType[];
  selectIndex: number;
};

export type JoinConditionType = {
  id: number;
  main_column: string;
  main_table: QueryTableType;
  secondary_column: string;
  secondary_table: QueryTableType;
};

export type QueryColumnType = {
  id: number;
  column_name: string;
  column_name_original: string;
  column_alias: string;
  column_filter: string;
  column_filter_operand: string;
  column_conditions: string[];
  column_filters: {
    id: number;
    filter: string;
  }[];
  column_values: {
    id: number;
    value: string;
  }[];
  column_value: string;
  column_aggregate: string;
  column_single_line_function: string;
  column_distinct_on: boolean;
  column_sort_order: string;
  column_order_dir: boolean;
  column_order_nr: number | null;
  column_nulls_position: string;
  column_group_by: boolean;
  column_order: boolean;
  display_in_query: boolean;
  filter_as_having: boolean;
  ordinal_position: number;
  data_type: string;
  constraints: {
    column_name: string;
    constraint_name: string;
    constraint_type: string; // e.g. 'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', etc.
    foreign_column_name: string | null;
    foreign_table_name: string | null;
    foreign_table_schema: string | null;
    table_name: string;
    table_schema: string;
  }[];
  table_name: string;
  table_schema: string;
  table_alias: string;
  table_id: number;
  subquerySql: string;
  subqueryId: number;
  returning: boolean;
  returningOnly: boolean;
  value_enabled: boolean;
  is_window_function?: boolean;
  window_function_name?: string; // e.g. 'RANK', 'DENSE_RANK', 'ROW_NUMBER' or 'SUM'
  window_partition_by?: string; // e.g. 'region' or name of the column
  window_order_by?: string;
};

export interface CTEType {
  id: string; // unique ID, e.g. 'cte_1'
  name: string; // user-defined name, e.g. 'big_cities'
  query: QueryType; // CTE's own complete query (tables, columns, etc.)
}