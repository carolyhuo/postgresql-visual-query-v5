import React, { useEffect, useState, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, EdgeProps } from '@xyflow/react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { removeJoin, updateJoin } from '../actions/queryActions';
import { JoinType, JoinConditionType } from '../types/queryTypes';
import _ from 'lodash';
import { translations } from '../utils/translations';

interface JoinEdgeData {
  join: JoinType;
  condition: JoinConditionType;
  mainTable: string;
  secondaryTable: string;
  sourceColumn: string;
  targetColumn: string;
  joinId?: number;
  isActive?: boolean;
  setIsActiveNull?: () => void;
}

// Enhanced JoinEdge component for displaying join relationships
function JoinEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  data,
}: EdgeProps) {
  const dispatch = useAppDispatch();
  const { setEdges } = useReactFlow();
  const [currentJoinType, setCurrentJoinType] = useState<string>('inner');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<number | null>(null);
  const language = useAppSelector((state) => state.settings.language);

  // Generate path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Extract join data from the edge
  const typedData = data as JoinEdgeData | undefined;
  const join = typedData?.join || { type: 'inner', id: 0, color: '#000000', main_table: {}, conditions: [] };
  const mainTable = typedData?.mainTable || 'Table';
  const secondaryTable = typedData?.secondaryTable || 'Table';
  const sourceColumn = typedData?.sourceColumn || 'column';
  const targetColumn = typedData?.targetColumn || 'column';
  const joinType = join.type || currentJoinType;
  const joinText = translations[language.code].queryBuilder;
  const joinTypeLabel =
    joinType === 'left'
      ? joinText.leftJoinLabel
      : joinType === 'right'
        ? joinText.rightJoinLabel
        : joinType === 'outer'
          ? joinText.outerJoinLabel
          : joinType === 'cross'
            ? joinText.crossJoinLabel
            : joinText.innerJoinLabel;
  const joinExplanation =
    joinType === 'left'
      ? joinText.leftJoinExplanation
      : joinType === 'right'
        ? joinText.rightJoinExplanation
        : joinType === 'outer'
          ? joinText.outerJoinExplanation
          : joinType === 'cross'
            ? joinText.crossJoinExplanation
            : joinText.innerJoinExplanation;

  const isActive = typedData?.isActive || false;
  const setIsActiveNull = typedData?.setIsActiveNull;

  // Update the current join type when it changes
  useEffect(() => {
    if (join && join.type) {
      setCurrentJoinType(join.type);
    }
  }, [join]);

  // Open dropdown when isActive changes to true
  useEffect(() => {
    if (isActive) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [isActive]);

  useEffect(
    () => () => {
      if (hoverTimeout.current !== null) {
        window.clearTimeout(hoverTimeout.current);
      }
    },
    [],
  );

  const keepExplanationOpen = () => {
    if (hoverTimeout.current !== null) {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setIsHovered(true);
  };

  const closeExplanation = () => {
    hoverTimeout.current = window.setTimeout(() => {
      hoverTimeout.current = null;
      setIsHovered(false);
    }, 120);
  };

  // Toggle dropdown manually
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle join type change
  const handleUpdateJoinType = (type: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling

    if (join && typeof join.id !== 'undefined') {
      // Deep clone the join to avoid reference issues
      const updatedJoin = _.cloneDeep(join);
      // Update the type
      updatedJoin.type = type;

      // Update local state immediately for UI responsiveness
      setCurrentJoinType(type);
      dispatch(updateJoin(updatedJoin));

      // Close the dropdown immediately
      setIsDropdownOpen(false);
      setIsActiveNull && setIsActiveNull();
    }
  };

  // Handle join removal
  const handleRemoveJoin = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling

    if (join && typeof join.id !== 'undefined') {
      // Deep clone the join to avoid reference issues
      const clonedJoin = _.cloneDeep(join);
      dispatch(removeJoin(clonedJoin));

      // Remove the edge from React Flow
      setEdges((edges) => edges.filter((edge) => edge.id !== id));

      // Reset active edge and close dropdown
      setIsDropdownOpen(false);
      setIsActiveNull && setIsActiveNull();
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          cursor: 'pointer',
          // strokeDasharray: 'none',
          strokeWidth: 2,
        }}
        interactionWidth={40}
        onMouseEnter={keepExplanationOpen}
        onMouseLeave={closeExplanation}
        onClick={() => {
          toggleDropdown();
        }}
      />
      <EdgeLabelRenderer>
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 10001,
            pointerEvents: isDropdownOpen || isHovered ? 'all' : 'none',
          }}
          className="join-controls"
          id={`join-label-${id}`}
          onMouseEnter={keepExplanationOpen}
          onMouseLeave={closeExplanation}
        >
          {isHovered && !isDropdownOpen && (
            <div className="join-explanation">
              <strong>{joinTypeLabel}</strong>
              <div>
                {mainTable}.{sourceColumn} = {secondaryTable}.{targetColumn}
              </div>
              <div>{joinExplanation}</div>
            </div>
          )}
          {isDropdownOpen && (
            <div className="dropdown-menu show" style={{ position: 'absolute', zIndex: 10001 }}>
              <div className="join-explanation dropdown-item-text">
                <strong>{joinTypeLabel}</strong>
                <div>
                  {mainTable}.{sourceColumn} = {secondaryTable}.{targetColumn}
                </div>
                <div>{joinExplanation}</div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                type="button"
                onClick={(e) => handleUpdateJoinType('inner', e)}
                style={currentJoinType === 'inner' ? { backgroundColor: '#007bff', color: 'white' } : {}}
              >
                {translations[language.code].queryBuilder.innerJoinDescription} <strong>{mainTable}</strong>{' '}
                {translations[language.code].queryBuilder.andText} <strong>{secondaryTable}</strong> (Inner Join)
              </button>
              <button
                className="dropdown-item"
                type="button"
                onClick={(e) => handleUpdateJoinType('left', e)}
                style={currentJoinType === 'left' ? { backgroundColor: '#007bff', color: 'white' } : {}}
              >
                {translations[language.code].queryBuilder.leftJoinDescription} <strong>{mainTable}</strong>,{' '}
                {translations[language.code].queryBuilder.matchingRowsFrom} <strong>{secondaryTable}</strong>
              </button>
              <button
                className="dropdown-item"
                type="button"
                onClick={(e) => handleUpdateJoinType('right', e)}
                style={currentJoinType === 'right' ? { backgroundColor: '#007bff', color: 'white' } : {}}
              >
                {translations[language.code].queryBuilder.rightJoinDescription} <strong>{secondaryTable}</strong>,{' '}
                {translations[language.code].queryBuilder.matchingRowsFrom} <strong>{mainTable}</strong>
              </button>
              <button
                className="dropdown-item"
                type="button"
                onClick={(e) => handleUpdateJoinType('outer', e)}
                style={currentJoinType === 'outer' ? { backgroundColor: '#007bff', color: 'white' } : {}}
              >
                {translations[language.code].queryBuilder.outerJoinDescription} <strong>{mainTable}</strong>{' '}
                {translations[language.code].queryBuilder.andText} <strong>{secondaryTable}</strong> (Full outer join)
              </button>
              <button
                className="dropdown-item"
                type="button"
                onClick={(e) => handleUpdateJoinType('cross', e)}
                style={currentJoinType === 'cross' ? { backgroundColor: '#007bff', color: 'white' } : {}}
              >
                {translations[language.code].queryBuilder.crossJoinDescription} <strong>{mainTable}</strong>{' '}
                {translations[language.code].queryBuilder.withEveryRowFrom} <strong>{secondaryTable}</strong> (Cross
                Join)
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item text-danger" type="button" onClick={handleRemoveJoin}>
                {translations[language.code].queryBuilder.deleteJoin}
              </button>
            </div>
          )}
        </div>
        {/*</div>*/}
      </EdgeLabelRenderer>
    </>
  );
}

export default JoinEdge;
