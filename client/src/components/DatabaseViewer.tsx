import React from 'react';
import { Scrollbars } from 'react-custom-scrollbars-2';
import _ from 'lodash';
import DatabaseTable from './DatabaseTable';
import CteSidebarTable from './CteSidebarTable';
import { filterTable } from '../utils/filterTable';
import { useAppSelector } from '../hooks';
import { DatabaseTableType } from '../types/databaseTypes';
import { QueryTableType } from '../types/queryTypes';
import { createEmptyColumn } from '../utils/columnUtils';
import { translations } from '../utils/translations';

export const DatabaseViewer: React.FC = () => {
  const language = useAppSelector((state) => state.settings.language);
  const {
    tables: databaseTables,
    selectedSchema,
    constraints,
    columns,
    searchExpr,
  } = useAppSelector((state) => state.database);
  const {
    tables: queryTables,
    queryType,
    ctes = [],
    activeTab,
    mainQueryBackup,
  } = useAppSelector((state) => state.query);
  const mainQueryTables =
    activeTab && activeTab !== 'main' ? mainQueryBackup?.tables || [] : queryTables;

  const constructData = (table: DatabaseTableType): QueryTableType => {
    // Create a QueryTableType based on the DatabaseTableType
    const tableId = Math.floor(Math.random() * 1000000);

    // Create the QueryTableType object
    const queryTable: QueryTableType = {
      id: tableId,
      table_schema: table.table_schema,
      table_name: table.table_name,
      table_type: table.table_type,
      table_alias: '',
      selectIndex: 0,
      columns: [],
    };

    // Check if there are existing tables with the same name to set alias
    const copies = queryTables.filter(
      (qt) => _.isEqual(qt.table_name, table.table_name) && _.isEqual(qt.table_schema, table.table_schema),
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
      queryTable.table_alias = `${table.table_name}_1`;
    }

    if (largestCopy > 0) {
      const index = largestCopy + 1;
      queryTable.table_alias = `${table.table_name}_${index}`;
    }

    // Set the selectIndex to the current tables count
    queryTable.selectIndex = queryTables.length;

    // Get constraints for this table
    const tableConstraints = constraints.filter(
      (constraint) => constraint.table_schema === table.table_schema && constraint.table_name === table.table_name,
    );

    // Get columns for this table
    const tableColumns = columns.filter(
      (column) => column.table_name === table.table_name && column.table_schema === table.table_schema,
    );

    // Convert database columns to query columns
    queryTable.columns = tableColumns.map((column) => {
      const columnConstraints = tableConstraints.filter((constraint) =>
        _.includes(constraint.column_name, column.column_name),
      );

      // Create a QueryColumnType using the utility function with specific overrides
      const queryColumn = createEmptyColumn({
        id: Math.floor(Math.random() * 1000000),
        column_name: column.column_name,
        column_name_original: column.column_name,
        column_conditions: ['', ''],
        column_filters: [{ id: 0, filter: '' }],
        column_values: [{ id: 0, value: 'DEFAULT' }],
        column_value: 'NULL',
        ordinal_position: column.ordinal_position,
        data_type: column.data_type,
        constraints: columnConstraints.map((c) => ({
          column_name: c.column_name,
          constraint_name: c.constraint_name,
          constraint_type: c.constraint_type,
          foreign_column_name: c.foreign_column_name || null,
          foreign_table_name: c.foreign_table_name || null,
          foreign_table_schema: c.foreign_table_schema || null,
          table_name: c.table_name,
          table_schema: c.table_schema,
        })),
        table_name: table.table_name,
        table_schema: table.table_schema,
        table_alias: queryTable.table_alias,
        table_id: tableId,
      });

      return queryColumn;
    });

    return queryTable;
  };

  return (
    <div className="flex-fill">
      <Scrollbars className="d-flex" autoHide>
        <div className="mt-1 pr-2">
          {databaseTables.map((table, index) => {
            const checked = queryTables.some(
              (qt: QueryTableType) =>
                _.isEqual(table.table_name, qt.table_name) && _.isEqual(table.table_schema, qt.table_schema),
            );

            const id = `database-table-${index}`;

            return (
              table.table_schema === selectedSchema &&
              filterTable(table, searchExpr) && (
                <DatabaseTable data={constructData(table)} checked={checked} key={id} id={id} queryType={queryType} />
              )
            );
          })}
          {queryType === 'SELECT' && ctes.length > 0 && (
            <section className="mt-3">
              <h6 className="d-flex align-items-center">
                {translations[language.code].sideBar.cteSection}
              </h6>
              {ctes.map((cte) => (
                <CteSidebarTable
                  key={cte.id}
                  cte={cte}
                  checked={mainQueryTables.some(
                    (table) => table.table_type === 'CTE' && table.table_name === cte.name,
                  )}
                  active={(activeTab || 'main') === cte.id}
                />
              ))}
            </section>
          )}
        </div>
      </Scrollbars>
    </div>
  );
};

export default DatabaseViewer;
