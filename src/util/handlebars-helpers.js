/**
 * Handlebars helpers for the application
 */

/**
 * Check if value is equal to another value
 */
const eq = (a, b) => a === b;

/**
 * Check if value is greater than another value
 */
const gt = (a, b) => a > b;

/**
 * Subtract two numbers
 */
const subtract = (a, b) => a - b;

/**
 * Add two numbers
 */
const add = (a, b) => a + b;

/**
 * Generate an array of numbers from 1 to n
 */
const times = (n, block) => {
  let accum = '';
  for (let i = 1; i <= n; i++) {
    accum += block.fn(i);
  }
  return accum;
};

/**
 * Truncate text to a specified length
 */
const truncate = (str, len) => {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= len) return str;
  return str.substring(0, len);
};

module.exports = {
  eq,
  gt,
  subtract,
  add,
  times,
  truncate
};
