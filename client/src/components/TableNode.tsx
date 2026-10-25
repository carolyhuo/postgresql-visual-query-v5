import React from 'react';
import QueryTable from './QueryTable';
import { useAppSelector } from '../hooks';
import { translations } from '../utils/translations';

// TableNode component for displaying database tables in flow diagram
function TableNode({ data }: any) {
  const { language } = useAppSelector((store) => ({
    language: store.settings.language,
  }));
  // Extract data from the node
  const { table, index, isDraggable } = data || { table: {}, index: 0, isDraggable: false };

  return (
    <div className={`table-node${table?.table_type === 'CTE' ? ' table-node-cte' : ''}`}>
      {isDraggable && (
        <div className="table-drag-handle">
          <i className="fa fa-arrows-alt mr-2" /> {translations[language.code].queryBuilder.dragToMove}
        </div>
      )}

      {/* Render the actual table content */}
      <QueryTable key={`query-table-${index}-${table.id}`} id={`query-table-${index}`} data={table} />
    </div>
  );
}

export default TableNode;
