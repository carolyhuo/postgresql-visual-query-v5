import scalarFunctionsArray from '../config/scalarFunctions.json';
import aggregateFunctionsArray from '../config/aggregateFunctions.json';

const NUMERIC_TYPES = ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision'];

const ALWAYS_AVAILABLE_WINDOW_FUNCTIONS = [
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
  'LAG',
  'LEAD',
  'FIRST_VALUE',
  'LAST_VALUE',
  'COUNT',
  'MIN',
  'MAX',
];

/**
 * Get available scalar functions for PostgreSQL
 * @returns Array of scalar function names
 */
export const getScalarFunctions = (): string[] => {
  // Check if environment variable exists and use it as fallback
  const envScalarFunctions = process.env.REACT_APP_SCALAR_FUNCTIONS?.split(',') || [];

  // Use JSON file as primary source
  return scalarFunctionsArray.length ? scalarFunctionsArray : envScalarFunctions;
};

/**
 * Get available aggregate functions for PostgreSQL
 * @returns Array of aggregate function names
 */
export const getAggregateFunctions = (): string[] => {
  // Check if environment variable exists and use it as fallback
  const envAggregateFunctions = process.env.REACT_APP_SINGE_LINE_FUNCTIONS?.split(',') || [];

  // Use JSON file as primary source
  return aggregateFunctionsArray.length ? aggregateFunctionsArray : envAggregateFunctions;
};

// Show SUM and AVG only if the column type is numeric
export const getAvailableWindowFunctions = (dataType: string): string[] => {
  const normalizedType = dataType.toLowerCase();
  return NUMERIC_TYPES.includes(normalizedType)
    ? [...ALWAYS_AVAILABLE_WINDOW_FUNCTIONS, 'SUM', 'AVG']
    : ALWAYS_AVAILABLE_WINDOW_FUNCTIONS;
};
