import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { addCte, removeCte, setActiveTab } from '../actions/queryActions';
import { translations } from '../utils/translations';

const QueryCteTabs: React.FC = () => {
  const dispatch = useAppDispatch();
  const { ctes, language, activeTab } = useAppSelector((state) => ({
    ctes: state.query.ctes || [],
    language: state.settings.language,
    activeTab: state.query.activeTab || 'main',
  }));
  const text = translations[language.code].queryBuilder;

  const handleAddCte = () => {
    const enteredName = window.prompt(text.cteNamePrompt);
    const name = enteredName?.trim();
    if (!name) {
      return;
    }

    if (ctes.some((cte) => cte.name.toLowerCase() === name.toLowerCase())) {
      window.alert(text.cteNameExists);
      return;
    }

    const newCteId = dispatch(addCte(name));
    dispatch(setActiveTab(newCteId));
  };

  const handleRemoveCte = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    dispatch(removeCte(id));
  };

  return (
    <div className="d-flex align-items-center flex-wrap border-bottom mb-2">
      <button
        type="button"
        className={`btn btn-sm rounded-0 ${activeTab === 'main' ? 'btn-secondary' : 'btn-light'}`}
        aria-pressed={activeTab === 'main'}
        onClick={() => dispatch(setActiveTab('main'))}
      >
        {text.mainQuery}
      </button>
      {ctes.map((cte) => (
        <div key={cte.id} className="d-flex align-items-center">
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${activeTab === cte.id ? 'btn-secondary' : 'btn-light'}`}
            aria-pressed={activeTab === cte.id}
            onClick={() => dispatch(setActiveTab(cte.id))}
          >
            {text.ctePrefix} {cte.name}
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${activeTab === cte.id ? 'btn-secondary' : 'btn-light'}`}
            aria-label={`${text.removeCte}: ${cte.name}`}
            onClick={(event) => handleRemoveCte(event, cte.id)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-link" onClick={handleAddCte}>
        + {text.addCte}
      </button>
    </div>
  );
};

export default QueryCteTabs;
