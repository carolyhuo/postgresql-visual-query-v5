import React, { useState } from 'react';
import _ from 'lodash';
import { CustomInput, FormGroup, Input, InputGroup } from 'reactstrap';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { translations } from '../utils/translations';

import QueryCreationTableColumn from './QueryCreationTableColumn';
import { useAppSelector, useAppDispatch } from '../hooks';
import { switchDistinct, switchLimit, switchTies, setLimitValue, updateColumnsOrder } from '../actions/queryActions';
// Custom tooltip styles
const tooltipStyle = {
  backgroundColor: '#f8f9fa',
  color: '#333',
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '8px 12px',
  maxWidth: '400px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  zIndex: 1000,
};

// Format tooltip content to make links clickable
const formatTooltipContent = (content: string, languageCode: 'eng' | 'est', psqlVersionNr: string) => {
  // Check if content exists and contains link
  if (!content || !content.includes('https://')) return content;
  // Split content at "More info: " to separate text and link
  const parts = content.split(/More info: |Rohkem infot: /);
  const text = parts[0];
  let link = parts[1];
  link = link.replace('current', psqlVersionNr);

  return (
    <div>
      {text}
      <span>{translations[languageCode].queryBuilder.moreInfo} </span>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#007bff', textDecoration: 'underline' }}
        onClick={(e) => e.stopPropagation()} // Prevent tooltip from closing when clicking link
      >
        {link}
      </a>
    </div>
  );
};

// Custom tooltip component
interface CustomTooltipProps {
  id: string;
  children: React.ReactNode;
  activeTooltip: string | null;
  toggleTooltip: (id: string) => void;
  position?: 'right' | 'top' | 'bottom';
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  id,
  children,
  activeTooltip,
  toggleTooltip,
  position = 'right',
}) => {
  const isActive = activeTooltip === `tooltip-${id}`;

  // Calculate positioning styles based on position prop
  const getPositionStyles = () => {
    if (id === 'column') {
      return {
        left: 'calc(100% + 10px)',
        top: '50%',
        transform: 'translateY(-20%)',
      };
    }
    switch (position) {
      case 'top':
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '10px',
        };
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '10px',
        };
      case 'right':
      default:
        return {
          left: 'calc(100% + 10px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
    }
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className="ml-2"
        id={`tooltip-${id}`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          toggleTooltip(`tooltip-${id}`);
        }}
      >
        <FontAwesomeIcon icon={faQuestionCircle} size="sm" style={{ color: isActive ? '#007bff' : '#6c757d' }} />
      </span>
      {isActive && (
        <div
          style={{
            ...tooltipStyle,
            position: 'absolute',
            width: '400px',
            ...getPositionStyles(),
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside tooltip
        >
          {children}
        </div>
      )}
    </span>
  );
};

export const QueryCreationTable: React.FC<Record<string, never>> = () => {
  const dispatch = useAppDispatch();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const psqlVersion = useAppSelector((state) => state.host.psqlVersion);
  let psqlVersionNr = psqlVersion.replace('PostgreSQL ', '');
  psqlVersionNr = psqlVersionNr.split('.')[0];
  // Retrieve state using selectors
  const { columns, distinct, limit, limitValue, withTies, language } = useAppSelector((store) => ({
    columns: _.orderBy(store.query.columns, ['filter_as_having'], ['asc']),
    distinct: store.query.distinct,
    limit: store.query.limit,
    limitValue: store.query.limitValue,
    withTies: store.query.withTies,
    language: store.settings.language,
  }));

  // Toggle tooltip visibility
  const toggleTooltip = (tooltipId: string) => {
    setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
  };

  // Calculate maxConditions from all columns
  const maxConditions = columns.length > 0 ? Math.max(...columns.map((col) => col.column_conditions.length)) : 2;

  // Create dynamic table labels array
  const baseLabels = [
    { id: 'column', label: translations[language.code].queryBuilder.columnLabel },
    { id: 'alias', label: translations[language.code].queryBuilder.aliasLabel },
    { id: 'table', label: translations[language.code].queryBuilder.tableLabel },
    { id: 'aggregate', label: translations[language.code].queryBuilder.aggregateLabel },
    { id: 'window-function', label: translations[language.code].queryBuilder.windowFunctionLabel },
    { id: 'partition-by', label: translations[language.code].queryBuilder.partitionByLabel },
    { id: 'window-order-by', label: translations[language.code].queryBuilder.windowOrderByLabel },
    { id: 'scalar', label: translations[language.code].queryBuilder.scalarLabel },
    { id: 'sort', label: translations[language.code].queryBuilder.sortLabel },
    { id: 'sort-order', label: translations[language.code].queryBuilder.sortOrderLabel },
    { id: 'nulls-position', label: translations[language.code].queryBuilder.nullsPositionLabel },
    { id: 'show', label: translations[language.code].queryBuilder.showLabel },
    { id: 'remove-duplicates', label: translations[language.code].queryBuilder.removeDuplicatesLabel },
    { id: 'criteria', label: translations[language.code].queryBuilder.criteriaLabel },
  ];

  // Add "Or" labels for remaining conditions
  const tableLabels = [
    ...baseLabels,
    ...Array(maxConditions - 1)
      .fill(null)
      .map(() => ({
        id: `or-1`,
        label: 'OR',
      })),
  ];

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const movedColumn = columns.find((column) => _.isEqual(draggableId, `query-column-${column.id}`));

    if (!movedColumn) {
      return;
    }

    const newColumns = Array.from(columns);
    newColumns.splice(source.index, 1);
    newColumns.splice(destination.index, 0, movedColumn);

    dispatch(updateColumnsOrder(newColumns));
  };

  return (
    <div onClick={() => activeTooltip && setActiveTooltip(null)}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="query-table-container" style={{ display: 'flex', overflowX: 'auto' }}>
          {/* Labels column */}
          <div
            className="labels-column"
            style={{ background: '#D9D9D9', minWidth: '200px', flexShrink: 0, position: 'relative' }}
          >
            {/* Add empty space to align with drag handle */}
            <div style={{ height: '30px', borderBottom: '1px solid #ddd' }} />

            {/* Labels */}
            {tableLabels.map((label, index) => (
              <div
                key={index}
                style={{
                  height: '56px',
                  padding: '0.75rem',
                  borderBottom: '1px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                <span>{label.label}</span>
                <CustomTooltip id={label.id} activeTooltip={activeTooltip} toggleTooltip={toggleTooltip}>
                  {formatTooltipContent(
                    translations[language.code].tooltips[
                      label.id as keyof (typeof translations)[typeof language.code]['tooltips']
                    ],
                    language.code as 'eng' | 'est',
                    psqlVersionNr,
                  )}
                </CustomTooltip>
              </div>
            ))}
          </div>

          {/* Droppable area for columns */}
          <Droppable droppableId="droppable-columns" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  display: 'flex',
                  flexGrow: 1,
                  border: '1px solid #dee2e6',
                  borderLeft: 'none',
                  position: 'relative',
                }}
              >
                {columns.length === 0 && (
                  <div className={'columns-placeholder'}>
                    {translations[language.code].queryBuilder.selectColumnsFromTop}
                  </div>
                )}
                {columns.map((column, index) => (
                  <QueryCreationTableColumn
                    key={column.id}
                    data={column}
                    id={`query-column-${column.id}`}
                    index={index}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
      <div className="mt-3">
        <FormGroup className="d-flex align-items-center">
          <div className="d-flex align-items-center" style={{ position: 'relative' }}>
            <CustomInput
              type="switch"
              id="distinct"
              label={translations[language.code].queryBuilder.distinctL}
              checked={distinct}
              onChange={() => dispatch(switchDistinct())}
            />
            <CustomTooltip
              id="distinct-switch"
              activeTooltip={activeTooltip}
              toggleTooltip={toggleTooltip}
              position="top"
            >
              {formatTooltipContent(
                translations[language.code].tooltips.distinct,
                language.code as 'eng' | 'est',
                psqlVersionNr,
              )}
            </CustomTooltip>
          </div>

          <div className="d-flex align-items-center ml-2 mr-2" style={{ position: 'relative' }}>
            <CustomInput
              type="switch"
              id="limit_switch"
              label={translations[language.code].queryBuilder.limitL}
              checked={limit}
              onChange={() => dispatch(switchLimit())}
            />
            <CustomTooltip id="limit-switch" activeTooltip={activeTooltip} toggleTooltip={toggleTooltip} position="top">
              {formatTooltipContent(
                translations[language.code].tooltips.limit,
                language.code as 'eng' | 'est',
                psqlVersionNr,
              )}
            </CustomTooltip>
          </div>

          {limit && (
            <InputGroup className="w-auto" size="sm">
              <Input
                id="limit"
                placeholder="Value"
                value={limitValue || ''}
                min={0}
                max={999}
                type="number"
                step="1"
                onChange={(e) => dispatch(setLimitValue(parseInt(e.target.value, 10)))}
              />
              <CustomTooltip
                id="limit-value"
                activeTooltip={activeTooltip}
                toggleTooltip={toggleTooltip}
                position="top"
              >
                {formatTooltipContent(
                  translations[language.code].tooltips.limitValueD,
                  language.code as 'eng' | 'est',
                  psqlVersionNr,
                )}
              </CustomTooltip>

              <div className="d-flex align-items-center ml-2" style={{ position: 'relative' }}>
                <CustomInput
                  type="switch"
                  id="ties_switch"
                  label={translations[language.code].queryBuilder.withTiesL}
                  checked={withTies}
                  onChange={() => dispatch(switchTies())}
                />
                <CustomTooltip
                  id="ties-switch"
                  activeTooltip={activeTooltip}
                  toggleTooltip={toggleTooltip}
                  position="top"
                >
                  {formatTooltipContent(
                    translations[language.code].tooltips.withTies,
                    language.code as 'eng' | 'est',
                    psqlVersionNr,
                  )}
                </CustomTooltip>
              </div>
            </InputGroup>
          )}
        </FormGroup>
      </div>
    </div>
  );
};

export default QueryCreationTable;
