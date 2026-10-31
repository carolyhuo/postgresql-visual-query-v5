import React, { useState, useEffect, useCallback } from 'react';
import { Button, ButtonGroup, Card, CardBody, CardTitle, UncontrolledTooltip } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Scrollbars } from 'react-custom-scrollbars-2';
import _ from 'lodash';
import { addTable, removeTable, resetQuery } from '../actions/queryActions';
import { translations } from '../utils/translations';
import { QueryTablePopover } from './QueryTablePopover';
import TableColumn from './TableColumn';
import { useAppDispatch, useAppSelector } from '../hooks';
import { QueryTableType, QueryColumnType } from '../types/queryTypes';
import { LanguageType } from '../types/settingsType';
import { createEmptyColumn } from '../utils/columnUtils';

interface QueryTableHeaderProps {
  data: QueryTableType;
  target: string;
  handleCopy: () => void;
  language: LanguageType;
  handleRemoveTable: () => void;
}

const QueryTableHeader: React.FC<QueryTableHeaderProps> = ({
  target,
  data,
  language,
  handleCopy,
  handleRemoveTable,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isCte = data.table_type === 'CTE';

  const togglePopover = () => {
    setPopoverOpen(!popoverOpen);
  };

  return (
    <CardTitle
      className="d-flex flex-column pb-1 mb-0 border-bottom"
      style={
        isCte
          ? { backgroundColor: '#ede9fe', borderBottomColor: '#c4b5fd' }
          : undefined
      }
    >
      <div className="d-flex align-items-center justify-content-between px-1" style={{ minWidth: 0 }}>
        <div className="d-flex align-items-center" style={{ minWidth: 0, flex: '1 1 auto' }}>
          <span
            id={target}
            title={data.table_name}
            className="text-truncate"
            style={{ minWidth: 0, maxWidth: '150px', color: isCte ? '#4c1d95' : undefined }}
          >
            {data.table_name}
          </span>
          {isCte && (
            <span
              className="badge"
              style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px', marginLeft: '6px' }}
            >
              CTE
            </span>
          )}
          <UncontrolledTooltip placement="top" target={target} className="text-truncate">
            {data.table_schema}
          </UncontrolledTooltip>
        </div>
        <ButtonGroup style={{ flexShrink: 0 }}>
          <Button
            size="sm"
            className="close-button"
            style={{ borderTopLeftRadius: '0px' }}
            onClick={handleCopy}
            id={`${target}_copy`}
            aria-label={translations[language.code].tooltips.copyTable}
            title={translations[language.code].tooltips.copyTable}
          >
            <FontAwesomeIcon icon="copy" color={'#4c4c4c'} />
          </Button>
          <Button
            size="sm"
            className="align-self-start close-button nodrag"
            style={{ borderBottomRightRadius: '0px' }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleRemoveTable();
            }}
            id={`${target}_remove`}
            aria-label={`Remove ${data.table_name}`}
            title={`Remove ${data.table_name}`}
          >
            <FontAwesomeIcon icon="times" color={'#4c4c4c'} />
          </Button>
        </ButtonGroup>
      </div>
      {data.table_alias && data.table_alias !== data.table_name && (
        <span
          className="px-1"
          style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.2 }}
        >
          alias: {data.table_alias}
        </span>
      )}
      <QueryTablePopover target={target} data={data} toggle={togglePopover} toggleStatus={popoverOpen} />
    </CardTitle>
  );
};

interface QueryTableBodyProps {
  data: QueryTableType;
  id: string;
  constructData: (column: QueryColumnType) => QueryColumnType;
}

const QueryTableBody: React.FC<QueryTableBodyProps> = React.memo(({ data, id, constructData }) => {
  const debouncedResize = useCallback(
    _.debounce(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100),
    [],
  );

  useEffect(
    () => () => {
      debouncedResize.cancel();
    },
    [debouncedResize],
  );

  // Create a special "select all" column for the table using the utility function
  const allColumnsData = createEmptyColumn({
    id: -1, // Special ID for the "all columns" option
    column_name: '*',
    column_name_original: '*',
    table_name: data.table_name,
    table_schema: data.table_schema,
    table_alias: data.table_alias,
    table_id: data.id,
    data_type: '*',
    value_enabled: false,
    // Override any other specific properties as needed
  });

  return (
    <Scrollbars autoHeight autoHeightMax={350} onScroll={debouncedResize}>
      <CardBody className="py-0 mt-2 mx-2 px-0 position-relative" style={{ zIndex: 1, backgroundColor: 'white' }}>
        {/* Add the "select all" * column first */}
        <div key={`${data.id}-column-all`} id={`${data.id}-column-all`} className="column-container">
          <div>
            <TableColumn id={`${id}-table-column-all`} data={constructData(allColumnsData)} />
          </div>
        </div>

        {data.columns.filter((column) => column.column_name.toLowerCase() !== 'xmin').map((column) => {
          const columnId = `${data.id}-column-${column.column_name}`;

          return (
            <div key={columnId} id={columnId} className="column-container">
              <div>
                <TableColumn id={`${id}-table-column-${column.column_name}`} data={constructData(column)} />
              </div>
            </div>
          );
        })}
      </CardBody>
    </Scrollbars>
  );
});

interface QueryTableProps {
  id: string;
  data: QueryTableType;
}

const QueryTable: React.FC<QueryTableProps> = React.memo(({ data, id }) => {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.settings.language);
  const queryType = useAppSelector((state) => state.query.queryType);
  const firstTableId = useAppSelector((state) => state.query.tables[0]?.id);

  const handleRemoveTable = useCallback(() => {
    if (['DELETE', 'UPDATE'].includes(queryType) && data.id === firstTableId) {
      dispatch(resetQuery(queryType));
    } else {
      dispatch(removeTable(data));
    }
  }, [dispatch, queryType, data, firstTableId]);

  const handleCopy = useCallback(() => {
    dispatch(addTable(data));
  }, [dispatch, data]);

  const constructData = useCallback(
    (column: QueryColumnType) => ({
      ...column,
      table_name: data.table_name,
      table_schema: data.table_schema,
      table_alias: data.table_alias,
      table_id: data.id,
    }),
    [data],
  );

  return (
    <Card
      className="d-inline-flex pb-2 position-relative"
      style={data.table_type === 'CTE' ? { borderColor: '#c4b5fd', borderWidth: '1.5px' } : undefined}
    >
      <QueryTableHeader
        target={id}
        data={data}
        language={language}
        handleRemoveTable={handleRemoveTable}
        handleCopy={handleCopy}
      />
      <QueryTableBody data={data} id={id} constructData={constructData} />
    </Card>
  );
});

export default QueryTable;
