import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'reactstrap';
import { Scrollbars } from 'react-custom-scrollbars-2';
import { translations } from '../utils/translations';
import QueryTable from '../components/QueryTable';
import QueryTabs from '../components/QueryTabs';
import QueryCteTabs from '../components/QueryCteTabs';
import QueryButton from '../components/QueryButton';
import DownloadSQLButton from '../components/DownloadSQLButton';
import DownloadCSVButton from '../components/DownloadCSVButton';
import ResultTabs from '../components/ResultTabs';
import LanguageSwitcher from '../components/LanguageSwitcher';
import DisconnectButton from '../components/DisconnectButton';
import SchemaSelector from '../components/SchemaSelector';
import SearchBar from '../components/SearchBar';
import DatabaseViewer from '../components/DatabaseViewer';
import NavBar from '../components/NavBar';
import TableView from '../components/TableView';
import { useAppDispatch, useAppSelector } from '../hooks';
import { JoinType, QueryTableType } from '../types/queryTypes';
import { addJoin, updateJoin } from '../actions/queryActions';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../styles/grid-layout.css';
import '../styles/reactflow.css';
import _ from 'lodash';
import {
  addEdge,
  applyNodeChanges,
  Background,
  Connection,
  Controls,
  Edge as ReactFlowEdge,
  EdgeTypes as ReactFlowEdgeTypes,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  NodeTypes as ReactFlowNodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom Node and Edge components
import TableNode from '../components/TableNode';
// @ts-ignore - component will be created later
import JoinEdge from '../components/JoinEdge';
import { logout } from '../actions/hostActions';

export const SideBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.settings.language);
  const dbName = useAppSelector((state) => state.host.database);
  return (
    <div className="d-flex flex-column w-100">
      <div className="">
        <LanguageSwitcher />
        <DisconnectButton />
        <Button className="w-100 mb-4 switch-db" color={'black'} onClick={() => dispatch(logout())}>
          {translations[language.code].loginForm.logout}
        </Button>
      </div>
      <SchemaSelector />
      <SearchBar />
      <h5 className="mt-2">
        {translations[language.code].sideBar.database}: {dbName}
      </h5>
      <h5 className="mt-2">{translations[language.code].sideBar.tablesH}</h5>
      <div className="d-flex flex-fill">
        <DatabaseViewer />
      </div>
    </div>
  );
};

interface TableTypeWrapperProps {
  index: number;
  children: React.ReactNode;
}

export const TableTypeWrapper: React.FC<TableTypeWrapperProps> = ({ index, children }) => (
  <div className="d-inline-flex">
    <div className={`d-flex flex-column m-2 border ${index === 0 ? 'border-success' : 'border-danger'}`}>
      <h6 className={`text-center ${index === 0 ? 'text-success' : 'text-danger'}`}>
        {index === 0 ? 'MAIN TABLE' : 'JOIN'}
      </h6>
      {children}
    </div>
  </div>
);

interface QueryBuilderProps {
  tables: QueryTableType[];
  queryValid: boolean;
  queryType: string;
}

// Define viewport interface
interface SavedFlowState {
  nodes: Node[];
  viewport: Viewport;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ tables, queryValid, queryType }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const reactFlowInstance = useRef<any>(null);
  const language = useAppSelector((state) => state.settings.language);

  // Get joins data from redux state
  const joins = useAppSelector((state) => state.query.joins);
  const query = useAppSelector((state) => state.query);

  // Track active edge ID
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  // Container dimensions
  const [containerWidth] = useState(1200);

  // Default viewport
  const defaultViewport = { x: 0, y: 0, zoom: 0.6 };

  // Add debounced viewport update to fix ResizeObserver issues
  const debouncedViewportUpdate = useCallback(
    _.debounce((viewport: Viewport) => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.setViewport(viewport);
      }
    }, 200),
    [],
  );

  // React Flow states with TypeScript errors bypassed
  // @ts-ignore - bypass TypeScript errors for node state
  const [nodes, setNodes] = useNodesState([]);
  // @ts-ignore - bypass TypeScript errors for edge state
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Define node types and edge types
  const nodeTypes = { tableNode: TableNode } as ReactFlowNodeTypes;
  const edgeTypes = { joinEdge: JoinEdge } as ReactFlowEdgeTypes;

  // Grid configuration for positioning nodes
  const gridConfig = {
    defaultHeight: 300,
    defaultWidth: 250,
    verticalSpacing: 200,
    horizontalSpacing: 300,
  };

  // Function to save flow state (nodes and viewport)
  const saveFlowState = useCallback(
    (nodes: Node[], viewport: Viewport) => {
      const state: SavedFlowState = {
        nodes,
        viewport,
      };
      sessionStorage.setItem(`flow-state-${query.id}`, JSON.stringify(state));
    },
    [query.id],
  );

  // Custom onNodesChange handler to save positions to sessionStorage
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // @ts-ignore - bypass type error between React Flow's node types and setState
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);

        // Get viewport from instance and save complete state
        if (reactFlowInstance.current) {
          const viewport = reactFlowInstance.current.getViewport();
          saveFlowState(updated, viewport);
        }

        return updated;
      });
    },
    [setNodes, saveFlowState],
  );

  // Handle viewport changes (pan & zoom)
  const onViewportChange = useCallback(
    (event: any, viewport: Viewport) => {
      if (nodes.length > 0) {
        saveFlowState(nodes, viewport);
      }
    },
    [nodes, saveFlowState],
  );

  // Function to get ReactFlow instance
  const onInit = useCallback(
    (instance: any) => {
      reactFlowInstance.current = instance;

      // Special handling for Main query (id = 0) to avoid ResizeObserver issues
      if (query.id === 0 && tables.length > 0) {
        // Use a short delay to ensure stable initialization
        setTimeout(() => {
          if (instance) {
            instance.fitView({ padding: 0.2 });
          }
        }, 50);
      }
    },
    [query.id, tables.length],
  );

  function parseHandleId(handleId: string) {
    // Match the structure: tableId-columnName-side-type
    // Find last 2 parts (e.g. 'left' + 'target') then pull out the rest as column name
    const parts = handleId.split('-');
    const tableId = parseInt(parts[0], 10);
    const handleType = parts[parts.length - 1]; // source/target
    const side = parts[parts.length - 2] as 'left' | 'right'; // left/right
    const columnName = parts.slice(1, parts.length - 2).join('-'); // support dash in column names

    return { tableId, columnName, side, handleType };
  }

  // Create nodes from tables
  useEffect(() => {
    if (tables.length === 0) {
      setNodes([]);
      return;
    }

    // Try to load saved flow state from sessionStorage
    const saved = sessionStorage.getItem(`flow-state-${query.id}`);
    let savedState: SavedFlowState | null = null;

    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        // Validate that the parsed state has the expected structure
        if (
          parsedState &&
          typeof parsedState === 'object' &&
          Array.isArray(parsedState.nodes) &&
          parsedState.viewport &&
          typeof parsedState.viewport === 'object'
        ) {
          savedState = parsedState;
        } else {
          console.warn('Invalid saved flow state structure');
        }
      } catch (e) {
        console.warn('Invalid saved flow state', e);
      }
    }

    // Calculate how many tables per row
    const tablesPerRow = Math.floor(containerWidth / gridConfig.horizontalSpacing);

    // Create nodes for each table
    const newNodes = tables.map((table, index) => {
      // Check if we have a saved position for this table
      const savedNode = savedState?.nodes?.find((n) => n.id === `table-${table.id}`);

      if (savedNode) {
        // If a saved position exists, use it
        return {
          id: `table-${table.id}`,
          type: 'tableNode',
          position: savedNode.position,
          data: {
            table,
            index,
            isDraggable: !['DELETE', 'UPDATE'].includes(queryType),
          },
          draggable: !['DELETE', 'UPDATE'].includes(queryType),
        };
      }

      // If no saved position, find the leftmost node
      const rightMostNode = nodes.reduce((leftmost: Node, node: Node) => {
        return node.position.x > leftmost.position.x ? node : leftmost;
      }, nodes[0]);

      // Place the new node to the right of the leftmost node
      const xPos = rightMostNode
        ? rightMostNode.position.x + (rightMostNode.measured?.width ? rightMostNode.measured.width + 100 : 250)
        : -600; // Position from the left edge - same for all queries
      const yPos = rightMostNode
        ? rightMostNode.position.y
        : Math.floor(index / tablesPerRow) * gridConfig.verticalSpacing + 50;

      return {
        id: `table-${table.id}`,
        type: 'tableNode',
        position: { x: xPos, y: yPos },
        data: {
          table,
          index,
          isDraggable: !['DELETE', 'UPDATE'].includes(queryType),
        },
        draggable: !['DELETE', 'UPDATE'].includes(queryType),
      };
    });

    // @ts-ignore - bypass TypeScript for node type assignment
    setNodes(newNodes);

    // If we have a saved viewport and instance is available, set it after a small delay
    if (savedState?.viewport && reactFlowInstance.current) {
      if (query.id === 0) {
        // For Main query (id=0), use debounced update to avoid ResizeObserver issues
        debouncedViewportUpdate(savedState.viewport as Viewport);
      } else {
        // For other queries, normal behavior
        setTimeout(() => {
          reactFlowInstance.current.setViewport(savedState?.viewport as Viewport);
        }, 100);
      }
    }
  }, [tables, containerWidth, queryType, setNodes, query.id]);

  const getMarker = (joinType: string) => {
    const marker = {
      type: MarkerType.ArrowClosed,
      color: 'black',
    };

    switch (joinType) {
      case 'full':
      case 'outer':
        return { markerStart: marker, markerEnd: marker };
      case 'left':
        // Arrow TO secondary table → secondary is NOT main side
        return { markerEnd: marker };
      case 'right':
        // Arrow TO main table → main side gets the arrow start
        return { markerStart: marker };
      case 'inner':
      case 'cross':
      default:
        return {};
    }
  };

  useEffect(() => {
    if (!joins || joins.length === 0 || !tables || tables.length === 0) {
      setEdges([]);
      return;
    }

    // For Main query, add a small delay to ensure nodes are properly positioned
    const createEdges = () => {
      const newEdges = joins.flatMap((join: JoinType): ReactFlowEdge[] => {
        return join.conditions.map((condition, condIndex) => {
          const sourceId = `table-${condition.main_table.id}`;
          const targetId = `table-${condition.secondary_table.id}`;
          const sourceSide = condition.main_table.joinHandleSide || 'right';
          const targetSide = condition.secondary_table.joinHandleSide || 'left';
          const sourceHandle = `${condition.main_table.id}-${condition.main_column}-${sourceSide}-source`;
          const targetHandle = `${condition.secondary_table.id}-${condition.secondary_column}-${targetSide}-target`;

          const markerConfig = getMarker(join.type);

          const edgeId = `join-${query.id}-${join.id}-${condIndex}`;

          return {
            id: edgeId,
            source: sourceId,
            target: targetId,
            style: {
              stroke: 'black',
              strokeWidth: 3,
              strokeDasharray: join.type === 'cross' ? '5,5' : 'none',
              cursor: 'pointer',
            },
            sourceHandle,
            targetHandle,
            type: 'joinEdge',
            animated: false,
            ...markerConfig,
            data: {
              isLabelOpen: true,
              join,
              condition,
              mainTable:
                condition.main_table.table_alias !== ''
                  ? condition.main_table.table_alias
                  : condition.main_table.table_name,
              secondaryTable:
                condition.secondary_table.table_alias !== ''
                  ? condition.secondary_table.table_alias
                  : condition.secondary_table.table_name,
              sourceColumn: condition.main_column,
              targetColumn: condition.secondary_column,
              isActive: edgeId === activeEdgeId,
              setIsActiveNull: () => {
                setActiveEdgeId(null);
              },
            },
          };
        });
      });

      // @ts-ignore - bypass TypeScript for edge type assignment
      setEdges(newEdges);
    };

    if (query.id === 0) {
      // For Main query, add a small delay to reduce ResizeObserver issues
      setTimeout(createEdges, 50);
    } else {
      createEdges();
    }
  }, [joins, setEdges, tables, activeEdgeId, query.id]);

  // Handle new connections

  const onConnect = (params: Connection) => {
    // console.log('tables', query.tables);
    // Extract table and column IDs from the source and target handles
    const sourceHandleId = params.sourceHandle;
    const targetHandleId = params.targetHandle;

    if (sourceHandleId && targetHandleId) {
      // Extract table and column IDs from the handles
      // Format is expected to be like "{tableId}-{columnName}-right" or "{tableId}-{columnName}-left"
      let source = parseHandleId(sourceHandleId);
      let target = parseHandleId(targetHandleId);

      if (source.tableId === target.tableId) {
        return;
      }

      if (source && target) {
        const sourceTableId = source.tableId;
        const targetTableId = target.tableId;

        const sourceColumnName = source.columnName;
        const targetColumnName = target.columnName;

        const sourceTable = tables.find((table) => table.id === sourceTableId);
        const targetTable = tables.find((table) => table.id === targetTableId);

        if (!sourceTable || !targetTable) return;

        const sourceTableSelectedIndex = sourceTable.selectIndex;
        const targetTableSelectedIndex = targetTable.selectIndex;

        const firstTableId = Math.min(sourceTableSelectedIndex, targetTableSelectedIndex);

        let mainTable, secondaryTable;
        let mainColumnName, secondaryColumnName;
        let mainSide, secondarySide;
        // always make first table in tables row the main table
        if (sourceTableSelectedIndex === firstTableId) {
          mainTable = sourceTable;
          mainColumnName = sourceColumnName;
          mainSide = source.side;

          secondaryTable = targetTable;
          secondaryColumnName = targetColumnName;
          secondarySide = target.side;
        } else if (targetTableSelectedIndex === firstTableId) {
          mainTable = targetTable;
          mainColumnName = targetColumnName;
          mainSide = target.side;

          secondaryTable = sourceTable;
          secondaryColumnName = sourceColumnName;
          secondarySide = source.side;
        } else {
          // If neither is first table, default to source as main
          mainTable = sourceTable;
          mainColumnName = sourceColumnName;
          mainSide = source.side;

          secondaryTable = targetTable;
          secondaryColumnName = targetColumnName;
          secondarySide = target.side;
        }

        // figure out what join type to use if there are previous joins with the same involved tables
        const involvedTablesSorted = [sourceTableId, targetTableId].sort().join('::');
        const existingJoin = joins.find((join) => {
          if (join.conditions.length > 0) {
            const existingMainId = join.main_table.id;
            const existingSecondaryId = join.conditions[0].secondary_table.id;
            const existingPairKey = [existingMainId, existingSecondaryId].sort().join('::');
            return existingPairKey === involvedTablesSorted;
          }
          return false;
        });

        const joinType = existingJoin ? existingJoin.type : 'inner'; // Use existing type if found

        const newJoin: JoinType = {
          id: joins.length,
          type: joinType,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          main_table: {
            id: mainTable.id,
            table_schema: mainTable.table_schema,
            table_name: mainTable.table_name,
            table_alias: mainTable.table_alias,
            table_type: mainTable.table_type,
            columns: mainTable.columns,
          },
          conditions: [
            {
              id: 0,
              main_column: mainColumnName,
              main_table: {
                joinHandleSide: mainSide,
                id: mainTable.id,
                table_schema: mainTable.table_schema,
                table_name: mainTable.table_name,
                table_alias: mainTable.table_alias,
                table_type: mainTable.table_type,
                columns: mainTable.columns,
                selectIndex: mainTable.selectIndex,
              },
              secondary_column: secondaryColumnName,
              secondary_table: {
                joinHandleSide: secondarySide,
                id: secondaryTable.id,
                table_schema: secondaryTable.table_schema,
                table_name: secondaryTable.table_name,
                table_alias: secondaryTable.table_alias,
                table_type: secondaryTable.table_type,
                columns: secondaryTable.columns,
                selectIndex: secondaryTable.selectIndex,
              },
            },
          ],
        };

        // console.log({ targetTable });
        const join = _.cloneDeep(newJoin); // safe clone if needed
        const newEdgeId = `join-${query.id}-${join.id}-0`;

        // Add the edge to React Flow for visualization with the join data
        // @ts-ignore - bypass TypeScript for edge type in addEdge
        setEdges((eds) => {
          const updatedEdges = addEdge(
            {
              ...params,
              id: `join-${query.id}-${join.id}`,
              type: 'joinEdge',
              animated: false,
              style: {
                stroke: 'black',
                strokeWidth: 3,
                strokeDasharray: join.type === 'cross' ? '5,5' : 'none',
                cursor: 'pointer',
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              data: {
                isLabelOpen: true,
                join,
                condition: join.conditions[0],
                mainTable: sourceTable.table_alias !== '' ? sourceTable.table_alias : sourceTable.table_name,
                secondaryTable: targetTable?.table_name !== '' ? targetTable.table_alias : targetTable.table_name,
                sourceColumn: source.columnName,
                targetColumn: target.columnName,
              },
            },
            eds,
          );

          return updatedEdges;
        });

        // Add the join first
        dispatch(addJoin(join, true));

        // Then update it to ensure it's properly registered
        dispatch(updateJoin(join));
        setTimeout(() => {
          setActiveEdgeId(newEdgeId);
        }, 100);
      }
    }

    // Highlight edges after connection
    // highlightEdges();
  };

  return (
    <div className="mt-0 pr-2">
      <NavBar />
      {queryType === 'SELECT' && <QueryCteTabs />}
      <ReactFlowProvider>
        <div ref={containerRef} className="grid-container">
          {['SELECT'].includes(queryType) && (
            <div style={{ width: '100%', height: '50vh', border: '1px solid #ddd', borderRadius: '4px' }}>
              {query.tables.length === 0 && (
                <div className={'flow-cover'}>{translations[language.code].queryBuilder.selectTableToStart}</div>
              )}

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                zoomOnScroll={true}
                preventScrolling={false}
                panOnDrag={true}
                minZoom={0.2}
                maxZoom={1}
                onPaneClick={() => {
                  setActiveEdgeId(null);
                }}
                defaultViewport={defaultViewport}
                onMove={onViewportChange}
                onInit={onInit}
                proOptions={{ hideAttribution: true }}
                className="react-flow-container"
                onEdgeClick={(event, clickedEdge) => {
                  setActiveEdgeId((clickedEdge as any).id);
                }}
                key={`flow-${query.id}`}
              >
                <Controls />
                <Background gap={16} color="#f8f8f8" />
                <MiniMap zoomable pannable />

                <Panel position="top-left" style={{ margin: '4px', boxShadow: 'none', border: 'none' }}>
                  <div className="p-1 bg-light" style={{ fontSize: '14px', lineHeight: '100%' }}>
                    <small>
                      {query.tables.length > 1 && (
                        <>
                          {translations[language.code].queryBuilder.dragToConnect} <br />
                        </>
                      )}
                      {translations[language.code].queryBuilder.generatedSQL}
                    </small>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          )}

          {/* Display fixed tables for DELETE/UPDATE queries */}
          {['DELETE', 'UPDATE', 'INSERT'].includes(queryType) && (
            <div className="fixed-tables mt-3">
              {tables.map((table, index) => (
                <div key={`fixed-table-${table.id}`}>
                  <TableTypeWrapper index={index}>
                    <QueryTable key={`query-table-${index}-${table.id}`} id={`query-table-${index}`} data={table} />
                  </TableTypeWrapper>
                </div>
              ))}
            </div>
          )}
        </div>
      </ReactFlowProvider>
      <QueryTabs />
      <div className="my-2">
        <QueryButton />

        {tables.length ? (
          <>
            <DownloadSQLButton />
            <DownloadCSVButton />
          </>
        ) : null}
      </div>
      {!queryValid && (
        <Alert color="danger" className="w-25">
          {translations[language.code].queryBuilder.invalidQuery}
        </Alert>
      )}
      <ResultTabs />
    </div>
  );
};

export const QueryPage: React.FC = () => {
  const { tables, queryValid, queryType } = useAppSelector((state) => state.query);
  const language = useAppSelector((state) => state.settings.language);
  const { activeTableId } = useAppSelector((state) => state.tableView);
  const scrollbarsRef = useRef<Scrollbars>(null);
  const [codeVisible, setCodeVisible] = useState(false);

  const scrollToBottom = () => {
    const scrollEl = (scrollbarsRef.current as any)?.view;
    scrollEl?.scrollTo({
      top: scrollEl.scrollHeight,
      behavior: 'smooth',
    });
  };

  const scrollToTop = () => {
    const scrollEl = (scrollbarsRef.current as any)?.view;
    scrollEl?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const el = (scrollbarsRef.current as any)?.view;
    if (!el) return;

    const handleCodeVisibility = () => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      const visibleBottom = scrollTop + clientHeight;
      const codeAreaStart = scrollHeight - window.innerHeight * 0.3;

      setCodeVisible(visibleBottom >= codeAreaStart);
    };

    el.addEventListener('scroll', handleCodeVisibility);
    return () => el.removeEventListener('scroll', handleCodeVisibility);
  }, []);

  return (
    <Container fluid>
      {codeVisible ? (
        <div className={'view-sql-shortcut'} onClick={scrollToTop}>
          {translations[language.code].queryBuilder.scrollToTop}
        </div>
      ) : (
        <div className={'view-sql-shortcut'} onClick={scrollToBottom}>
          {translations[language.code].queryBuilder.viewSQLCode}
        </div>
      )}
      <Row>
        <Col sm="2" className="py-2 vh-100 d-flex bg-light">
          <SideBar />
        </Col>
        <Col sm="10" className="pr-0" id={'query-area'}>
          <Scrollbars ref={scrollbarsRef} id={'query-area-scroll'}>
            {activeTableId === null ? (
              <QueryBuilder queryValid={queryValid} tables={tables} queryType={queryType} />
            ) : (
              <div className="mt-0 pr-2">
                <NavBar />
                <TableView tableId={activeTableId} />
              </div>
            )}
          </Scrollbars>
        </Col>
      </Row>
    </Container>
  );
};

export default QueryPage;
