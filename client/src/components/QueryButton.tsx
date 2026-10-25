import React from 'react';
import { Button } from 'reactstrap';
import { executeCtePreview, query, updateValidity } from '../actions/queryActions';
import { translations } from '../utils/translations';
import { validateSql } from '../utils/validateQuery';
import { useAppDispatch, useAppSelector } from '../hooks';

export const QueryButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryState = useAppSelector((state) => state.query);
  const sql = queryState.sql;
  const language = useAppSelector((state) => state.settings.language);
  const querying = queryState.querying;
  const activeCte = queryState.ctes?.find(
    (cte) => cte.id === queryState.activeTab || cte.name === queryState.activeTab,
  );
  const isCtePreview = queryState.activeTab !== undefined && queryState.activeTab !== 'main' && !!activeCte;
  const hostDetails = useAppSelector((state) => ({
    database: state.host.database,
    user: state.host.user,
    password: state.host.password,
  }));

  const handleOnClick = () => {
    if (isCtePreview) {
      dispatch(executeCtePreview());
      return;
    }

    const isValid = validateSql(sql);

    dispatch(updateValidity(isValid));

    if (isValid) {
      dispatch(
        query({
          ...hostDetails,
          sql,
        }),
      );
    }
  };

  return (
    <Button type="button" size="lg" color="primary" className="mr-2" onClick={handleOnClick} disabled={querying}>
      {querying ? (
        <div className="d-flex align-items-center justify-content-center">
          <div className="mr-2">{translations[language.code].queryBuilder.querying}</div>
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        </div>
      ) : (
        isCtePreview
          ? translations[language.code].queryBuilder.executeCtePreview
          : translations[language.code].queryBuilder.queryB
      )}
    </Button>
  );
};

export default QueryButton;
