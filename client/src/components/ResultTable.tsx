import React, { useMemo } from 'react';
import { useTable, usePagination } from 'react-table';
import { Button } from 'reactstrap';
import { useAppSelector } from '../hooks';
import { translations } from '../utils/translations';

// Define error type
interface ErrorResponse {
  message: string;
  code: string;
  position: string;
  request?: {
    response: string;
  };
}

// Define field type
interface FieldType {
  name: string;
  tableID: number;
  columnID: number;
  dataTypeID: number;
  dataTypeSize: number;
  dataTypeModifier: number;
  format: string;
}

// Define result type
interface ResultType {
  command: string;
  fields: FieldType[];
  oid: number | null;
  rowAsArray: boolean;
  rowCount: number;
  rows: Record<string, any>[];
  fullRowCount?: number;
  hasMoreRows?: boolean;
  isCtePreview?: boolean;
}

// Define the row number cell component outside the main component
interface RowNumberCellProps {
  index: number;
}

const RowNumberCell: React.FC<RowNumberCellProps> = ({ index }) => <div>{index + 1}</div>;

// Cell renderer for row numbers - defined outside component
interface CellRendererProps {
  row: {
    index: number;
  };
}

const CellRenderer: React.FC<CellRendererProps> = ({ row }) => <RowNumberCell index={row.index} />;

interface ResultTableProps {
  showReturnToEditor: boolean;
  onReturnToEditor: () => void;
}

const ResultTable: React.FC<ResultTableProps> = ({ showReturnToEditor, onReturnToEditor }) => {
  // Use Redux hooks instead of connect HOC
  const result = useAppSelector((state) => state.query.result) as ResultType | null;
  const error = useAppSelector((state) => state.query.error) as ErrorResponse | null;
  const { language, isPreviewLoading } = useAppSelector((state) => ({
    language: state.settings.language,
    isPreviewLoading: state.query.querying && Boolean(state.query.activeTab && state.query.activeTab !== 'main'),
  }));

  // Use useMemo to cache the parsed rows and columns to avoid recalculation on every render
  const parsedRows = useMemo(() => {
    if (!result || !result.rows) return [];

    // Don't clone the entire result set - process rows individually
    return result.rows.map((row: Record<string, any>) => {
      // Create a new object instead of mutating the original
      const tableRow: Record<string, string> = {};

      result.fields.forEach((field: FieldType) => {
        const value = row[field.name];
        if (value === null || value === undefined) {
          tableRow[field.name] = '';
        } else if (typeof value === 'object' || typeof value === 'boolean') {
          tableRow[field.name] = JSON.stringify(value);
        } else {
          tableRow[field.name] = value;
        }
      });

      return tableRow;
    });
  }, [result]);

  const columns = useMemo(() => {
    if (!result || !result.fields) return [];

    const cols: any[] = [
      {
        Header: '#',
        id: 'row',
        maxWidth: 50,
        disableFilters: true,
        Cell: CellRenderer,
      },
    ];

    // Keep track of column names to handle duplicates
    const columnCounts: Record<string, number> = {};

    result.fields.forEach((field: FieldType) => {
      // Count occurrences of this column name
      columnCounts[field.name] = (columnCounts[field.name] || 0) + 1;

      // If this is a duplicate, append a number to make it unique
      const columnId = columnCounts[field.name] > 1 ? `${field.name}_${columnCounts[field.name]}` : field.name;

      cols.push({
        Header: field.name,
        accessor: field.name,
        id: columnId, // Use the unique columnId as the column identifier
      });
    });

    return cols;
  }, [result]);

  const defaultPageSize = 20;

  // Set up React Table with the useTable hook
  const tableInstance = useTable(
    {
      columns,
      data: parsedRows,
      initialState: { pageSize: defaultPageSize } as any,
    },
    usePagination,
  ) as any;

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    nextPage,
    previousPage,
    state: { pageIndex },
  } = tableInstance;

  let errorData: ErrorResponse | null = error;

  if (error && error.request && error.request.response) {
    errorData = JSON.parse(error.request.response);
  }

  // Check if we have a large result set that's been limited
  const hasLimitedResults = result && result.hasMoreRows;
  const fullRowCount = result?.fullRowCount;

  return (
    <div className="result">
      {showReturnToEditor && (
        <div className="d-flex justify-content-end align-items-center mb-2">
          <Button color="secondary" size="sm" onClick={onReturnToEditor}>
            {translations[language.code].queryBuilder.returnToEditor}
          </Button>
        </div>
      )}
      {isPreviewLoading && (
        <div className="alert alert-info d-flex align-items-center" role="status">
          <span className="spinner-border spinner-border-sm mr-2" aria-hidden="true" />
          {translations[language.code].queryBuilder.loadingCtePreview}
        </div>
      )}
      {!isPreviewLoading && result && (
        <>
          {result.isCtePreview && (
            <div className="alert alert-info mb-3" role="alert">
              {translations[language.code].queryBuilder.ctePreviewNotice}
            </div>
          )}
          {!result.isCtePreview && hasLimitedResults && (
            <div className="alert alert-info mb-3" role="alert">
              <strong>Note:</strong> Showing {result.rows.length} of {fullRowCount || 'many'} rows for better
              performance. You can modify your query to include a LIMIT clause for more specific results.
            </div>
          )}

          <div className="table-responsive">
            <table {...getTableProps()} className="table table-striped table-hover">
              <thead>
                {headerGroups.map((headerGroup: any) => (
                  <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                    {headerGroup.headers.map((column: any) => (
                      <th {...column.getHeaderProps()} key={column.id}>
                        {column.render('Header')}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {page.map((row: any) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} key={row.id}>
                      {row.cells.map((cell: any) => (
                        <td {...cell.getCellProps()} key={cell.column.id}>
                          {cell.render('Cell')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="pagination d-flex justify-content-between align-items-center mt-3">
              <div>
                <button
                  type="button"
                  onClick={() => previousPage()}
                  disabled={!canPreviousPage}
                  className="btn btn-sm btn-outline-secondary mr-2"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => nextPage()}
                  disabled={!canNextPage}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Next
                </button>
              </div>
              <span>
                Page{' '}
                <strong>
                  {pageIndex + 1} of {pageOptions.length}
                </strong>
              </span>
            </div>
          )}
        </>
      )}
      {!isPreviewLoading && error && errorData && (
        <div className="alert alert-danger" role="alert">
          {`ERROR: ${errorData.message}`}
          <div className="w-100" />
          {`CODE: ${errorData.code}`}
          <div className="w-100" />
          {`POSITION: ${errorData.position}`}
        </div>
      )}
    </div>
  );
};

export default ResultTable;
