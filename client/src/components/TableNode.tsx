import React from 'react';
import QueryTable from './QueryTable';
import { useAppSelector } from '../hooks';
import { translations } from '../utils/translations';
import { Node, NodeProps } from '@xyflow/react';
import { QueryTableType } from '../types/queryTypes';

// TableNode component for displaying database tables in flow diagram
interface TableNodeData extends Record<string, unknown> {
  table: QueryTableType;
  index: number;
  isDraggable: boolean;
}

type TableFlowNode = Node<TableNodeData>;

const TableNode: React.FC<NodeProps<TableFlowNode>> = ({ data }) => {
  const { language } = useAppSelector((store) => ({
    language: store.settings.language,
  }));
  const { table, index, isDraggable } = data;

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
};

export default TableNode;
