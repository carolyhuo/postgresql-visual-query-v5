import { CTEType, QueryColumnType, QueryTableType } from '../types/queryTypes';
import { createEmptyColumn } from './columnUtils';

export const CTE_DRAG_DATA_TYPE = 'application/x-query-cte';

export const createCteTable = (cte: CTEType): QueryTableType => {
  const selectedColumns = (cte.query?.columns || []).filter((column) => column?.display_in_query);
  const tableId = -1;

  const columns: QueryColumnType[] = selectedColumns.map((column, index) => {
    const columnName: string =
      column.column_alias ||
      (column.is_window_function ? `${column.window_function_name?.toLowerCase() || 'row_number'}_result` : '') ||
      column.column_name;

    return createEmptyColumn({
      column_name: columnName,
      column_name_original: columnName,
      data_type: column.data_type,
      ordinal_position: index + 1,
      table_name: cte.name,
      table_schema: '',
      table_alias: '',
      table_id: tableId,
    });
  });

  return {
    id: tableId,
    table_name: cte.name,
    table_schema: '',
    table_type: 'CTE',
    table_alias: '',
    selectIndex: 0,
    columns,
  };
};
