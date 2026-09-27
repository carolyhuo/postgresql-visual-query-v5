import axiosClient from '../utils/axiosClient';
import { JoinType } from '../types/queryTypes';
import { Dispatch } from 'redux';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import {
  AddColumnAction,
  AddTableAction,
  ChangeDefaultValueAction,
  ChangeQueryTypeAction,
  QueryActions,
  RemoveColumnAction,
  RemoveJoinAction,
  RemoveSetAction,
  RemoveTableAction,
  RemoveUsingAction,
  ResetQueryAction,
  SetActiveQueryAction,
  SetLimitValueAction,
  UpdateColumnAction,
  UpdateColumnFilterAction,
  UpdateColumnsOrderAction,
  UpdateFromQueryAction,
  UpdateJoinAction,
  UpdateJoinNewTableAction,
  UpdateJoinsOrderAction,
  UpdateSetAction,
  UpdateSetsOrderAction,
  UpdateSqlAction,
  UpdateTableAction,
  UpdateUsingAction,
  UpdateValidityAction,
} from '../types/actions/queryActionTypes';

export const ADD_COLUMN = 'ADD_COLUMN';
export const GENERATE_SQL = 'GENERATE_SQL';
export const SWITCH_DISTINCT = 'SWITCH_DISTINCT';
export const SWITCH_RETURNING = 'SWITCH_RETURNING';
export const SWITCH_FROM_QUERY = 'SWITCH_FROM_QUERY';
export const UPDATE_FROM_QUERY = 'UPDATE_FROM_QUERY';
export const ADD_TABLE = 'ADD_TABLE';
export const ADD_ROWS = 'ADD_ROWS';
export const REMOVE_ROWS = 'REMOVE_ROWS';
export const CHANGE_QUERY_TYPE = 'CHANGE_QUERY_TYPE';
export const REMOVE_TABLE = 'REMOVE_TABLE';
export const UPDATE_COLUMN = 'UPDATE_COLUMN';
export const UPDATE_COLUMNS_ORDER = 'UPDATE_COLUMNS_ORDER';
export const UPDATE_TABLE = 'UPDATE_TABLE';
export const UPDATE_JOINS_ORDER = 'UPDATE_JOINS_ORDER';
export const ADD_RESULT = 'ADD_RESULT';
export const ADD_RESULT_REJECTED = 'ADD_RESULT_REJECTED';
export const ADD_RESULT_FULFILLED = 'ADD_RESULT_FULFILLED';
export const ADD_JOIN = 'ADD_JOIN';
export const UPDATE_JOIN = 'UPDATE_JOIN';
export const UPDATE_JOIN_NEW_TABLE = 'UPDATE_JOIN_NEW_TABLE';
export const REMOVE_JOIN = 'REMOVE_JOIN';
export const ADD_USING = 'ADD_USING';
export const UPDATE_USING = 'UPDATE_USING';
export const REMOVE_USING = 'REMOVE_USING';
export const REMOVE_COLUMN = 'REMOVE_COLUMN';
export const DELETE_QUERY = 'DELETE_QUERY';
export const RESET_QUERY = 'RESET_QUERY';
export const QUERYING = 'QUERYING';
export const UPDATE_COLUMN_OPERAND = 'UPDATE_COLUMN_OPERAND';
export const UPDATE_SQL = 'UPDATE_SQL';
export const SET_ACTIVE_QUERY = 'SET_ACTIVE_QUERY';
export const SWITCH_LIMIT = 'SWITCH_LIMIT';
export const SWITCH_TIES = 'SWITCH_TIES';
export const SET_LIMIT_VALUE = 'SET_LIMIT_VALUE';
export const ADD_SET = 'ADD_SET';
export const UPDATE_SET = 'UPDATE_SET';
export const REMOVE_SET = 'REMOVE_SET';
export const UPDATE_SETS_ORDER = 'UPDATE_SETS_ORDER';
export const UPDATE_VALIDITY = 'UPDATE_VALIDITY';
export const CHANGE_DEFAULT_VALUE = 'CHANGE_DEFAULT_VALUE';
export const ADD_FILTER_ROW = 'ADD_FILTER_ROW';
export const REMOVE_FILTER_ROW = 'REMOVE_FILTER_ROW';
export const UPDATE_COLUMN_FILTER = 'UPDATE_COLUMN_FILTER';
export const ADD_CTE = 'ADD_CTE';
export const REMOVE_CTE = 'REMOVE_CTE';

type RootState = any; // Ideally replace 'any' with your actual root state type

export const generateSql = (): ThunkAction<void, RootState, unknown, QueryActions> => (dispatch, getState) => {
  // Get access to both query and queries state
  const state = getState();
  const queries = [...(state.queries || []), state.query];

  dispatch({
    type: GENERATE_SQL,
    payload: { queries },
  });
};

export const regenerateSql = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch(generateSql());
};
export const addColumn =
  (data: AddColumnAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: ADD_COLUMN, payload: data });
    dispatch(generateSql());
  };

export const addRows = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: ADD_ROWS });
  dispatch(generateSql());
};

export const removeRows = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: REMOVE_ROWS });
  dispatch(generateSql());
};

export const addFilterRow = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: ADD_FILTER_ROW });
  dispatch(generateSql());
};

export const removeFilterRow = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: REMOVE_FILTER_ROW });
  dispatch(generateSql());
};

export const updateColumnFilter =
  (data: UpdateColumnFilterAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_COLUMN_FILTER, payload: data });
    dispatch(generateSql());
  };

export const switchDistinct = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: SWITCH_DISTINCT });
  dispatch(generateSql());
};

export const switchReturning = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: SWITCH_RETURNING });
  dispatch(generateSql());
};

export const switchFromQuery = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: SWITCH_FROM_QUERY });
  dispatch(generateSql());
};

export const updateFromQuery =
  (data: UpdateFromQueryAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_FROM_QUERY, payload: data });
    dispatch(generateSql());
  };

export const changeQueryType = (data: ChangeQueryTypeAction['payload']) => (dispatch: Dispatch<QueryActions>) => {
  dispatch({ type: CHANGE_QUERY_TYPE, payload: data });
};

export const changeDefaultValue =
  (data: ChangeDefaultValueAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: CHANGE_DEFAULT_VALUE, payload: data });
    dispatch(generateSql());
  };

export const addTable =
  (data: AddTableAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: ADD_TABLE, payload: data });
    dispatch(generateSql());
  };

export const removeTable =
  (data: RemoveTableAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: REMOVE_TABLE, payload: data });
    dispatch(generateSql());
  };

export const updateColumn =
  (data: UpdateColumnAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_COLUMN, payload: data });
    dispatch(generateSql());
  };

export const updateColumnOperand =
  (operand: string, id: number) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_COLUMN_OPERAND, payload: { operand, id } });
    dispatch(generateSql());
  };

export const updateColumnsOrder =
  (data: UpdateColumnsOrderAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_COLUMNS_ORDER, payload: data });
    dispatch(generateSql());
  };

export const updateTable =
  (data: UpdateTableAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_TABLE, payload: data });
    dispatch(generateSql());
  };

export const updateJoinsOrder =
  (data: UpdateJoinsOrderAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_JOINS_ORDER, payload: data });
    dispatch(generateSql());
  };

export const queryAction = (state: any) => ({
  type: ADD_RESULT,
  payload: axiosClient.post('/query/query', {
    database: state.database,
    user: state.user,
    password: state.password,
    sql: state.sql,
  }),
});

export const query = (state: any) => async (dispatch: Dispatch<QueryActions>) => {
  try {
    dispatch({ type: QUERYING });

    // Send the SQL as-is, don't modify it on the client side
    // This avoids syntax errors with LIMIT clause
    const response = await axiosClient.post('/query/query', {
      database: state.database,
      user: state.user,
      password: state.password,
      sql: state.sql,
      maxRows: 10000, // Server should respect this parameter to limit large result sets
    });

    dispatch({ type: ADD_RESULT_FULFILLED, payload: response.data });
  } catch (error) {
    dispatch({ type: ADD_RESULT_REJECTED, payload: error as string });
  }
};

export const addJoin =
  (join?: JoinType, isDragAndDrop = false) =>
  (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({
      type: ADD_JOIN,
      payload: {
        join,
        isDragAndDrop,
      },
    });
    dispatch(generateSql());
  };

export const updateJoin =
  (data: UpdateJoinAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_JOIN, payload: data });
    dispatch(generateSql());
  };

export const updateJoinNewTable =
  (data: UpdateJoinNewTableAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_JOIN_NEW_TABLE, payload: data });
    dispatch(generateSql());
  };

export const removeJoin =
  (data: RemoveJoinAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: REMOVE_JOIN, payload: data });
    dispatch(generateSql());
  };

export const addUsing = () => ({ type: ADD_USING });

export const updateUsing =
  (data: UpdateUsingAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_USING, payload: data });
    dispatch(generateSql());
  };

export const removeUsing =
  (data: RemoveUsingAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: REMOVE_USING, payload: data });
    dispatch(generateSql());
  };

export const removeColumn =
  (data: RemoveColumnAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: REMOVE_COLUMN, payload: data });
    dispatch(generateSql());
  };

export const deleteQuery = () => ({ type: DELETE_QUERY });

export const resetQuery = (data: ResetQueryAction['payload']) => (dispatch: Dispatch<QueryActions>) => {
  dispatch({ type: RESET_QUERY, payload: data });
};

export const updateSql = (sql: UpdateSqlAction['payload']) => ({ type: UPDATE_SQL, payload: sql });

export const setActiveQuery = (data: SetActiveQueryAction['payload']) => ({ type: SET_ACTIVE_QUERY, payload: data });

export const addCte = (name: string) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  const id = `cte-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  dispatch({ type: ADD_CTE, payload: { id, name } });
  dispatch(generateSql());
  return id;
};

export const removeCte = (id: string) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: REMOVE_CTE, payload: id });
  dispatch(generateSql());
};

export const switchLimit = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: SWITCH_LIMIT });
  dispatch(generateSql());
};

export const switchTies = () => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
  dispatch({ type: SWITCH_TIES });
  dispatch(generateSql());
};

export const setLimitValue =
  (limitValue: SetLimitValueAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: SET_LIMIT_VALUE, payload: limitValue });
    dispatch(generateSql());
  };

export const updateValidity = (isValid: UpdateValidityAction['payload']) => ({
  type: UPDATE_VALIDITY,
  payload: { isValid },
});

export const addSet = () => ({ type: ADD_SET });

export const updateSet =
  (data: UpdateSetAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_SET, payload: data });
    dispatch(generateSql());
  };

export const removeSet =
  (data: RemoveSetAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: REMOVE_SET, payload: data });
    dispatch(generateSql());
  };

export const updateSetsOrder =
  (data: UpdateSetsOrderAction['payload']) => (dispatch: ThunkDispatch<RootState, unknown, QueryActions>) => {
    dispatch({ type: UPDATE_SETS_ORDER, payload: data });
    dispatch(generateSql());
  };
