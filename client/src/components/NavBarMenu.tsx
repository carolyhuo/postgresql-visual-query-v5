import React, { useState } from 'react';
import { Row, Input, Label, Col, UncontrolledTooltip } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { InputWithDeleteButton } from './InputWithDeleteButton';
import { translations } from '../utils/translations';
import { LanguageType } from '../types/settingsType';
import { QueryType } from '../types/queryTypes';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setActiveQuery, changeQueryType } from '../actions/queryActions';
import SaveQueryButton from './SaveQueryButton';
import LoadQueryButton from './LoadQueryButton';
import ClearQueryButton from './ClearQueryButton';
// import CopyQueryButton from './CopyQueryButton';

interface NavBarMenuProps {
  language: LanguageType;
}

export const NavBarMenu: React.FC<NavBarMenuProps> = ({ language }) => {
  const [queryName, setQueryName] = useState<string>('');

  const dispatch = useAppDispatch();
  const activeQuery = useAppSelector((state) => state.query) as QueryType;
  const queryType = useAppSelector((state) => state.query.queryType) as string;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQueryName(e.target.value);

    let query = _.cloneDeep(activeQuery);

    query = {
      ...query,
      [e.currentTarget.name]: e.target.value || '',
    };

    dispatch(setActiveQuery(query));
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    let query = _.cloneDeep(activeQuery);

    setQueryName('');

    query = {
      ...query,
      [(e.currentTarget as HTMLButtonElement).name]: '',
    };

    dispatch(setActiveQuery(query));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(changeQueryType(e.target.value));
  };

  return (
    <div className="pl-2 align-self-start m-0 pt-1 pb-2 bg-light">
      {activeQuery.id !== 0 && (
        <Row form>
          <div className="col-auto">
            <InputWithDeleteButton
              className="pb-2"
              id="newQueryAlias"
              name="queryName"
              placeholder={`${translations[language.code].queryBuilder.queryNamePh}`}
              tooltipTarget="newQueryAlias"
              tooltipText={` ${translations[language.code].tooltips.queryName}`}
              value={queryName}
              handleChange={handleChange}
              handleRemove={handleRemove}
            />
          </div>
        </Row>
      )}
      <div className="col-auto pl-0 d-flex align-items-center">
        <Row form className="align-items-center">
          {/*TODO: Add change query type back and fix errors*/}
          <Label for="changeQueryType" className="mr-1">
            {translations[language.code].navBar.statementType}:
          </Label>
          <span id="statement-type-info" className="mr-2 text-muted" style={{ cursor: 'help' }}>
            <FontAwesomeIcon icon={faQuestionCircle} />
          </span>
          <UncontrolledTooltip placement="top" target="statement-type-info">
            {translations[language.code].navBar.statementTypeInfo}
          </UncontrolledTooltip>
          <Col md={3}>
            <Input bsSize="sm" type="select" id="changeQueryType" onChange={handleTypeChange} value={queryType}>
              <option value="SELECT">SELECT</option>
              <option value="DELETE">DELETE</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
            </Input>
          </Col>
          <Col md={8} className="d-flex pt-1">
            <SaveQueryButton />
            <LoadQueryButton />
            <ClearQueryButton />
            {/*<CopyQueryButton />*/}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default NavBarMenu;
