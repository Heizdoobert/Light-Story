export * from './types';
export * from './numbers';
export * from './dates';
export * from './bytes';
export * from './text';

import * as numbers from './numbers';
import * as dates from './dates';
import * as bytes from './bytes';
import * as text from './text';

/**
 * Unified formatters namespace for Light-Story.
 */
export const formatters = {
  ...numbers,
  ...dates,
  ...bytes,
  ...text,
};
