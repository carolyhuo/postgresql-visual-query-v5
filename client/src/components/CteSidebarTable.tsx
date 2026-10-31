import React from 'react';
import { Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { addTable, setActiveTab } from '../actions/queryActions';
import { useAppDispatch, useAppSelector } from '../hooks';
import { CTEType } from '../types/queryTypes';
import { createCteTable, CTE_DRAG_DATA_TYPE } from '../utils/cteTableUtils';
import { translations } from '../utils/translations';

interface CteSidebarTableProps {
  cte: CTEType;
  checked: boolean;
  active: boolean;
  isMainView: boolean;
}

const CteSidebarTable: React.FC<CteSidebarTableProps> = ({ cte, checked, active, isMainView }) => {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.settings.language);
  const table = createCteTable(cte);
  const text = translations[language.code].sideBar;
  const disabledTooltip = 'Aktiivset vahetabelit ei saa iseenda sisse lohistada';

  return (
    <div
      className="w-100 pr-1 position-relative my-1"
      title={active ? disabledTooltip : `Add CTE ${cte.name} to the query`}
      style={{ opacity: active ? 0.5 : 1, cursor: active ? 'not-allowed' : 'grab' }}
    >
      <Button
        size="sm"
        color="secondary"
        id={`cte-table-${cte.id}`}
        className="btn-block pt-0 text-left"
        style={{
          paddingRight: '30px',
          backgroundColor: checked ? '#28a745' : '#6f42c1',
          borderColor: checked ? '#28a745' : '#6f42c1',
          color: '#fff',
          cursor: active ? 'not-allowed' : 'grab',
        }}
        disabled={active}
        draggable={!active}
        aria-disabled={active}
        onClick={() => {
          if (!active) {
            dispatch(addTable(table));
          }
        }}
        onDragStart={(event) => {
          if (active) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.setData(CTE_DRAG_DATA_TYPE, cte.id);
          event.dataTransfer.effectAllowed = 'copy';
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="w-100 text-truncate">
            <small className="text-truncate align-self-start">
              <span className="mr-1 px-0">
                <FontAwesomeIcon icon="th-large" />
              </span>
              CTE TABLE
            </small>
            <div className="text-truncate">{` ${cte.name}`}</div>
            <small className={`badge ${checked ? 'badge-success' : 'badge-light'}`}>
              {isMainView
                ? checked
                  ? text.cteUsedInMain
                  : text.cteNotUsedInMain
                : checked
                  ? text.cteUsedInView
                  : text.cteNotInView}
            </small>
          </div>
        </div>
      </Button>
      <button
        type="button"
        className="open-new-tab-btn"
        aria-label={`Open CTE ${cte.name}`}
        title={translations[language.code].tooltips.openInNewTab}
        disabled={active}
        aria-disabled={active}
        style={active ? { cursor: 'not-allowed' } : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!active) {
            dispatch(setActiveTab(cte.id));
          }
        }}
      >
        <FontAwesomeIcon icon={faEye} style={{ width: '1rem', height: '1rem' }} color="#007bff" />
      </button>
    </div>
  );
};

export default CteSidebarTable;
