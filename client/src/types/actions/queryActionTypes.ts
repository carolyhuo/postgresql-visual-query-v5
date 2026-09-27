import {
  ADD_COLUMN,
  ADD_CTE,
  ADD_FILTER_ROW,
  ADD_JOIN,
  ADD_RESULT,
  ADD_RESULT_FULFILLED,
  ADD_RESULT_REJECTED,
  ADD_ROWS,
  ADD_SET,
  ADD_TABLE,
  ADD_USING,
  CHANGE_DEFAULT_VALUE,
  CHANGE_QUERY_TYPE,
  DELETE_QUERY,
  GENERATE_SQL,
  QUERYING,
  REMOVE_COLUMN,
  REMOVE_CTE,
  REMOVE_FILTER_ROW,
  REMOVE_JOIN,
  REMOVE_ROWS,
  REMOVE_SET,
  REMOVE_TABLE,
  REMOVE_USING,
  RESET_QUERY,
  SET_ACTIVE_QUERY,
  SET_LIMIT_VALUE,
  SWITCH_DISTINCT,
  SWITCH_FROM_QUERY,
  SWITCH_LIMIT,
  SWITCH_RETURNING,
  SWITCH_TIES,
  UPDATE_COLUMN,
  UPDATE_COLUMN_FILTER,
  UPDATE_COLUMN_OPERAND,
  UPDATE_COLUMNS_ORDER,
  UPDATE_FROM_QUERY,
  UPDATE_JOIN,
  UPDATE_JOIN_NEW_TABLE,
  UPDATE_JOINS_ORDER,
  UPDATE_SET,
  UPDATE_SETS_ORDER,
  UPDATE_SQL,
  UPDATE_TABLE,
  UPDATE_USING,
  UPDATE_VALIDITY,
} from '../../actions/queryActions';

import {
  CONNECT_ERROR,
  CONNECTED,
  CONNECTING,
  DISCONNECT_FROM_DATABASE,
  LOGGED_IN,
  LOGGED_OUT,
  PSQL_VERSION,
} from '../../actions/hostActions';

import {
  CTEType,
  JoinType,
  QueryColumnType,
  QueryTableType,
  QueryType,
  ResultType,
  SetType,
  UsingType,
} from '../queryTypes';

export interface SetActiveQueryAction {
  type: typeof SET_ACTIVE_QUERY;
  payload: QueryType;
}

export interface AddCteAction {
  type: typeof ADD_CTE;
  payload: Pick<CTEType, 'id' | 'name'>;
}

export interface RemoveCteAction {
  type: typeof REMOVE_CTE;
  payload: string;
}

export interface AddColumnAction {
  type: typeof ADD_COLUMN;
  payload: QueryColumnType;
}

export interface ChangeQueryTypeAction {
  type: typeof CHANGE_QUERY_TYPE;
  payload: string;
}

export interface RemoveColumnAction {
  type: typeof REMOVE_COLUMN;
  payload: QueryColumnType; // column id
}

export interface UpdateColumnAction {
  type: typeof UPDATE_COLUMN;
  payload: QueryColumnType;
}

export interface UpdateColumnOperandAction {
  type: typeof UPDATE_COLUMN_OPERAND;
  payload: {
    operand: string;
    id: number;
  };
}

export interface UpdateColumnsOrderAction {
  type: typeof UPDATE_COLUMNS_ORDER;
  payload: QueryColumnType[];
}

export interface AddTableAction {
  type: typeof ADD_TABLE;
  payload: QueryTableType;
}

export interface RemoveTableAction {
  type: typeof REMOVE_TABLE;
  payload: QueryTableType; // table id
}

export interface UpdateTableAction {
  type: typeof UPDATE_TABLE;
  payload: QueryTableType;
}

export interface AddJoinAction {
  type: typeof ADD_JOIN;
  payload: {
    join?: JoinType;
    isDragAndDrop: boolean;
  };
}

export interface RemoveJoinAction {
  type: typeof REMOVE_JOIN;
  payload: JoinType;
}

export interface UpdateJoinAction {
  type: typeof UPDATE_JOIN;
  payload: JoinType;
}

export interface UpdateJoinNewTableAction {
  type: typeof UPDATE_JOIN_NEW_TABLE;
  payload: JoinType;
}

export interface UpdateJoinsOrderAction {
  type: typeof UPDATE_JOINS_ORDER;
  payload: JoinType[];
}

export interface AddSetAction {
  type: typeof ADD_SET;
}

export interface RemoveSetAction {
  type: typeof REMOVE_SET;
  payload: SetType; // set id
}

export interface UpdateSetAction {
  type: typeof UPDATE_SET;
  payload: SetType;
}

export interface UpdateSetsOrderAction {
  type: typeof UPDATE_SETS_ORDER;
  payload: {
    id: number;
    color: string;
    subqueryId: number;
    subquerySql: string;
    type: 'union' | 'unionall' | 'intersect' | 'except';
  }[];
}

export interface SwitchDistinctAction {
  type: typeof SWITCH_DISTINCT;
}

export interface SwitchReturningAction {
  type: typeof SWITCH_RETURNING;
}

export interface SwitchFromQueryAction {
  type: typeof SWITCH_FROM_QUERY;
}

export interface UpdateFromQueryAction {
  type: typeof UPDATE_FROM_QUERY;
  payload: {
    subqueryId: number;
    subquerySql: string;
  };
}

export interface SwitchLimitAction {
  type: typeof SWITCH_LIMIT;
}

export interface SetLimitValueAction {
  type: typeof SET_LIMIT_VALUE;
  payload: number;
}

export interface SwitchTiesAction {
  type: typeof SWITCH_TIES;
}

export interface GenerateSqlAction {
  type: typeof GENERATE_SQL;
  payload: {
    queries: QueryType[];
  };
}

export interface UpdateSqlAction {
  type: typeof UPDATE_SQL;
  payload: string;
}

export interface UpdateValidityAction {
  type: typeof UPDATE_VALIDITY;
  payload: {
    isValid: boolean;
  };
}

export interface AddResultAction {
  type: typeof ADD_RESULT;
  payload: any; // Result from the API call
}

export interface QueryingAction {
  type: typeof QUERYING;
}

export interface ResetQueryAction {
  type: typeof RESET_QUERY;
  payload?: any;
}

export interface DeleteQueryAction {
  type: typeof DELETE_QUERY;
}

export interface AddRowsAction {
  type: typeof ADD_ROWS;
}

export interface RemoveRowsAction {
  type: typeof REMOVE_ROWS;
}

export interface AddUsingAction {
  type: typeof ADD_USING;
}

export interface UpdateUsingAction {
  type: typeof UPDATE_USING;
  payload: {
    newTable: boolean;
    using: UsingType;
  };
}

export interface RemoveUsingAction {
  type: typeof REMOVE_USING;
  payload: UsingType; // using id
}

export interface ChangeDefaultValueAction {
  type: typeof CHANGE_DEFAULT_VALUE;
  payload: string;
}

export interface AddFilterRowAction {
  type: typeof ADD_FILTER_ROW;
}

export interface RemoveFilterRowAction {
  type: typeof REMOVE_FILTER_ROW;
}

export interface UpdateColumnFilterAction {
  type: typeof UPDATE_COLUMN_FILTER;
  payload: {
    columnId: number;
    filterId: number;
    filter: string;
  };
}

export interface ConnectingAction {
  type: typeof CONNECTING;
}

export interface ConnectedAction {
  type: typeof CONNECTED;
  payload: {
    connection: any;
  };
}

export interface ConnectErrorAction {
  type: typeof CONNECT_ERROR;
  payload: string; // error message
}

export interface DisconnectFromDatabaseAction {
  type: typeof DISCONNECT_FROM_DATABASE;
}

export interface LoggedInAction {
  type: typeof LOGGED_IN;
  payload: {
    user: string;
    password: string;
    database: string;
  };
}

export interface LoggedOutAction {
  type: typeof LOGGED_OUT;
}

export interface PsqlVersionAction {
  type: typeof PSQL_VERSION;
  payload: string;
}

export interface AddResultRejectedAction {
  type: typeof ADD_RESULT_REJECTED;
  payload: string; // Result from the API call
}

export interface AddResultFulfilledAction {
  type: typeof ADD_RESULT_FULFILLED;
  payload: ResultType; // Result from the API call
}

// Combine all actions into QueryActions type
export type QueryActions =
  | SetActiveQueryAction
  | AddCteAction
  | RemoveCteAction
  | AddColumnAction
  | ChangeQueryTypeAction
  | RemoveColumnAction
  | UpdateColumnAction
  | UpdateColumnOperandAction
  | UpdateColumnsOrderAction
  | AddTableAction
  | RemoveTableAction
  | UpdateTableAction
  | AddJoinAction
  | RemoveJoinAction
  | UpdateJoinAction
  | UpdateJoinNewTableAction
  | UpdateJoinsOrderAction
  | AddSetAction
  | RemoveSetAction
  | UpdateSetAction
  | UpdateSetsOrderAction
  | SwitchDistinctAction
  | SwitchReturningAction
  | SwitchFromQueryAction
  | UpdateFromQueryAction
  | SwitchLimitAction
  | SetLimitValueAction
  | SwitchTiesAction
  | GenerateSqlAction
  | UpdateSqlAction
  | UpdateValidityAction
  | AddResultAction
  | QueryingAction
  | ResetQueryAction
  | DeleteQueryAction
  | AddRowsAction
  | RemoveRowsAction
  | AddUsingAction
  | UpdateUsingAction
  | RemoveUsingAction
  | ChangeDefaultValueAction
  | AddFilterRowAction
  | RemoveFilterRowAction
  | UpdateColumnFilterAction
  | ConnectingAction
  | ConnectedAction
  | ConnectErrorAction
  | DisconnectFromDatabaseAction
  | LoggedInAction
  | LoggedOutAction
  | AddResultRejectedAction
  | AddResultFulfilledAction
  | PsqlVersionAction;
