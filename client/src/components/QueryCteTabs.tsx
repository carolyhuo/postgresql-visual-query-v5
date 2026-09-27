import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { addCte, removeCte } from '../actions/queryActions';
import { translations } from '../utils/translations';

const QueryCteTabs: React.FC = () => {
  const dispatch = useAppDispatch();
  const { ctes, language } = useAppSelector((state) => ({
    ctes: state.query.ctes || [],
    language: state.settings.language,
  }));
  const [selectedCteId, setSelectedCteId] = useState<string | null>(null);
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
    setSelectedCteId(newCteId);
  };

  const handleRemoveCte = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    dispatch(removeCte(id));
    if (selectedCteId === id) {
      setSelectedCteId(null);
    }
  };

  return (
    <div className="d-flex align-items-center flex-wrap border-bottom mb-2">
      <button
        type="button"
        className={`btn btn-sm rounded-0 ${selectedCteId === null ? 'btn-secondary' : 'btn-light'}`}
        aria-pressed={selectedCteId === null}
        onClick={() => setSelectedCteId(null)}
      >
        {text.mainQuery}
      </button>
      {ctes.map((cte) => (
        <div key={cte.id} className="d-flex align-items-center">
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${selectedCteId === cte.id ? 'btn-secondary' : 'btn-light'}`}
            aria-pressed={selectedCteId === cte.id}
            onClick={() => setSelectedCteId(cte.id)}
          >
            {text.ctePrefix} {cte.name}
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${selectedCteId === cte.id ? 'btn-secondary' : 'btn-light'}`}
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
