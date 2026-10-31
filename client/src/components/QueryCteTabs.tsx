import React, { useState } from 'react';
import { Button, FormGroup, Input, Label, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { useAppDispatch, useAppSelector } from '../hooks';
import { addCte, removeCte, SET_ACTIVE_TAB } from '../actions/queryActions';
import { translations } from '../utils/translations';
import { CTEType } from '../types/queryTypes';

const QueryCteTabs: React.FC = () => {
  const dispatch = useAppDispatch();
  const { ctes, language, activeTab, queryType } = useAppSelector((state) => ({
    ctes: state.query.ctes || [],
    language: state.settings.language,
    activeTab: state.query.activeTab || 'main',
    queryType: state.query.queryType,
  }));
  const text = translations[language.code].queryBuilder;
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [cteName, setCteName] = useState('');
  const [nameExists, setNameExists] = useState(false);
  const normalizedCteName = cteName.trim().replace(/\s+/g, '_');
  const isCteNameValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalizedCteName);

  if (queryType !== 'SELECT') {
    return null;
  }

  const handleAddCte = (): void => {
    const name = normalizedCteName;
    if (!isCteNameValid) {
      return;
    }

    if (ctes.some((cte) => cte.name.toLowerCase() === name.toLowerCase())) {
      setNameExists(true);
      return;
    }

    const newCteId = dispatch(addCte(name));
    setCreateModalOpen(false);
    setCteName('');
    setNameExists(false);
    dispatch({ type: SET_ACTIVE_TAB, payload: newCteId });
  };

  const handleRemoveCte = (event: React.MouseEvent<HTMLButtonElement>, cte: CTEType): void => {
    event.stopPropagation();
    dispatch(removeCte(cte.id));
  };

  const handleSelectCte = (cte: CTEType): void => {
    dispatch({ type: SET_ACTIVE_TAB, payload: cte.id });
  };

  return (
    <div className="d-flex align-items-center flex-wrap border-bottom mb-2">
      <button
        type="button"
        className={`btn btn-sm rounded-0 ${activeTab === 'main' ? 'btn-secondary' : 'btn-light'}`}
        aria-pressed={activeTab === 'main'}
        onClick={() => dispatch({ type: SET_ACTIVE_TAB, payload: 'main' })}
      >
        {text.mainQuery}
      </button>
      {ctes.map((cte) => (
        <div key={cte.id} className="d-flex align-items-center">
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${activeTab === cte.id ? 'btn-secondary' : 'btn-light'}`}
            aria-pressed={activeTab === cte.id}
            onClick={() => handleSelectCte(cte)}
          >
            {text.ctePrefix} {cte.name}
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-0 ${activeTab === cte.id ? 'btn-secondary' : 'btn-light'}`}
            aria-label={`${text.closeCteTab}: ${cte.name}`}
            title={`${text.closeCteTab}: ${cte.name}`}
            onClick={(event) => handleRemoveCte(event, cte)}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm rounded-0 cte-tab-add-action"
        onClick={() => {
          setCteName('');
          setNameExists(false);
          setCreateModalOpen(true);
        }}
      >
        <span aria-hidden="true">＋</span>
        <span className="ml-1">{text.addCte}</span>
      </button>
      <Modal isOpen={isCreateModalOpen} toggle={() => setCreateModalOpen(false)}>
        <ModalHeader toggle={() => setCreateModalOpen(false)}>{text.cteCreateTitle}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="cte-name">{text.cteNamePrompt}</Label>
            <Input
              id="cte-name"
              autoFocus
              value={cteName}
              placeholder={text.cteNamePlaceholder}
              invalid={nameExists || (Boolean(normalizedCteName) && !isCteNameValid)}
              onBlur={() => setCteName(normalizedCteName)}
              onChange={(event) => {
                setCteName(event.target.value);
                setNameExists(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddCte();
                }
              }}
            />
            {nameExists && <div className="text-danger small mt-1">{text.cteNameExists}</div>}
            {!nameExists && normalizedCteName && !isCteNameValid && (
              <div className="text-danger small mt-1">{text.cteInvalidName}</div>
            )}
            <small className="form-text text-muted">{text.cteDescription}</small>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setCreateModalOpen(false)}>
            {text.cancelCteCreation}
          </Button>
          <Button color="primary" onClick={handleAddCte} disabled={!isCteNameValid}>
            {text.createCte}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default QueryCteTabs;
