import { createCteTable } from '../../utils/cteTableUtils';

describe('createCteTable', () => {
  test('creates an empty virtual table when query columns are missing', () => {
    const table = createCteTable({
      id: 'cte-empty',
      name: 'empty_cte',
      query: {},
    });

    expect(table.columns).toEqual([]);
  });

  test('creates a virtual table from only the CTE output columns', () => {
    const cte = {
      id: 'cte-1',
      name: 'suured_linnad',
      query: {
        columns: [
          {
            column_name: 'city_name',
            column_alias: 'name',
            data_type: 'text',
            display_in_query: true,
          },
          {
            column_name: 'population',
            column_alias: '',
            data_type: 'integer',
            display_in_query: true,
          },
          {
            column_name: 'internal_value',
            column_alias: '',
            data_type: 'integer',
            display_in_query: false,
          },
        ],
      },
    };

    const table = createCteTable(cte);

    expect(table).toMatchObject({
      table_name: 'suured_linnad',
      table_schema: '',
      table_type: 'CTE',
      columns: [
        { column_name: 'name', column_name_original: 'name', data_type: 'text' },
        { column_name: 'population', column_name_original: 'population', data_type: 'integer' },
      ],
    });
    expect(table.columns).toHaveLength(2);
  });
});
