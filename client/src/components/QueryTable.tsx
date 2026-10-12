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
      className="d-flex pb-1 mb-0 border-bottom"
      style={
        isCte
          ? { backgroundColor: '#ede9fe', borderColor: '#c4b5fd', borderBottomColor: '#c4b5fd' }
          : undefined
      }
    >
      <div className="px-1 flex-fill d-flex">
        <Button
          outline
          color={isCte ? 'link' : 'info'}
          id={target}
          type="button"
          className="align-self-center btn-block p-0 px-1 text-left text-truncate"
          style={isCte ? { color: '#4c1d95', borderColor: '#c4b5fd', textDecoration: 'none' } : undefined}
        >
          {data.table_alias ? `${data.table_name} (${data.table_alias})` : data.table_name}
          {isCte && (
            <span
              className="badge ml-2"
              style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '10px' }}
            >
              CTE
            </span>
          )}
        </Button>
        <UncontrolledTooltip placement="top" target={target} className="text-truncate">
          {data.table_schema}
        </UncontrolledTooltip>
      </div>
      <ButtonGroup>
        <Button
          size="sm"
          // color="secondary"
          className="close-button"
          style={{ borderTopLeftRadius: '0px' }}
          onClick={handleCopy}
          id={`${target}_copy`}
        >
          <FontAwesomeIcon icon="copy" color={'#4c4c4c'} />
        </Button>
        <UncontrolledTooltip
          placement="top"
          target={`${target}_copy`}
          delay={{ show: 500, hide: 0 }}
          className="text-truncate"
        >
          {translations[language.code].tooltips.copyTable}
        </UncontrolledTooltip>
        <Button
          size="sm"
          className="align-self-start close-button"
          // color="danger"
          style={{ borderBottomRightRadius: '0px' }}
          onClick={handleRemoveTable}
          id={`${target}_remove`}
        >
          <FontAwesomeIcon icon="times" color={'#4c4c4c'} />
        </Button>
      </ButtonGroup>
      <QueryTablePopover target={target} data={data} toggle={togglePopover} toggleStatus={popoverOpen} />
    </CardTitle>
  );
};

interface QueryTableBodyProps {
  data: QueryTableType;
  id: string;
  constructData: (column: QueryColumnType) => any;
}

const QueryTableBody: React.FC<QueryTableBodyProps> = React.memo(({ data, id, constructData }) => {
  const debouncedResize = useCallback(
    _.debounce(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedResize.cancel();
    };
  }, [debouncedResize]);

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

        {data.columns.map((column) => {
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
