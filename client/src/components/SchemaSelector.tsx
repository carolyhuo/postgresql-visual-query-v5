import React from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { changeSelectedSchema } from '../actions/databaseActions';
import { withToggle } from '../hocs/withToggle';
import { translations } from '../utils/translations';
import { useAppSelector, useAppDispatch } from '../hooks';

interface SchemaSelectorProps {
  toggle: () => void;
  toggleStatus: boolean;
}

export const SchemaSelector: React.FC<SchemaSelectorProps> = ({ toggle, toggleStatus }) => {
  const dispatch = useAppDispatch();
  const schemas = useAppSelector((state) => state.database.schemas).filter((schema) => {
    const normalizedSchema = schema.toLowerCase();
    return normalizedSchema !== 'information_schema' && !normalizedSchema.startsWith('pg_');
  });
  const selectedSchema = useAppSelector((state) => state.database.selectedSchema);
  const language = useAppSelector((state) => state.settings.language);
  const psqlVersion = useAppSelector((state) => state.host.psqlVersion);

  const handleOnClick = (schema: string) => {
    dispatch(changeSelectedSchema(schema));
  };

  return (
    <div className="mb-2">
      <h6>{psqlVersion}</h6>
      <h5>{translations[language.code].sideBar.schemaH}</h5>
      <Dropdown size="sm" className="w-100" isOpen={toggleStatus} toggle={toggle}>
        <DropdownToggle caret className="w-100 btn btn-light btn-outline-secondary text-truncate">
          {selectedSchema}
        </DropdownToggle>
        <DropdownMenu>
          {schemas.map((schema) => (
            <DropdownItem key={schema} onClick={() => handleOnClick(schema)}>
              {schema}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

export default withToggle(SchemaSelector);
