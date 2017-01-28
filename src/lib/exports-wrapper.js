import _ from 'lodash';

import MemoizorPromise from './MemoizorPromise';
import MemoizorCallback from './MemoizorCallback';
import MemoizorSync from './MemoizorSync';

/**
 * Memoizes functions that return promises.
 * @param {function} target The target function to memoize.
 * @param {object} options Various options for setting up the memoization.
 * @returns {function} The memoized function.
 * @export
 */
export function promise(target, options) {
  return new MemoizorPromise(target, options).memoized;
}

/**
 * Memoizes functions that return callbacks.
 * @param {function} target The target function to memoize.
 * @param {object} options Various options for setting up the memoization.
 * @returns {function} The memoized function.
 * @export
 */
export function callback(target, options) {
  return new MemoizorCallback(target, options).memoized;
}

/**
 * Memoizes regular ole' syncronous functions.
 * @param {function} target The target function to memoize.
 * @param {object} options Various options for setting up the memoization.
 * @returns {function} The memoized function.
 * @export
 */
export function sync(target, options) {
  return new MemoizorSync(target, options).memoized;
}

/**
 * Returns the appropriate lodash function based on the type of "item".
 * @param {Array|object} item The item to get the lodash function based one.
 * @returns {function} _.map or _.mapValues, depending on the input.
 */
const mappingFn = (item) => {
  if (!_.isObject(item)) {
    const msg = `Expected a non-null object or array, but got: ${item === null ? 'null' : typeof item}`;
    throw new TypeError(msg);
  }

  return _[Array.isArray(item) ? 'map' : 'mapValues'];
};

// Memoizes all given functions...
promise.all = (targets, options) =>
  mappingFn(targets)(targets, target => promise(target, options));

callback.all = (targets, options) =>
  mappingFn(targets)(targets, target => callback(target, options));

sync.all = (targets, options) =>
  mappingFn(targets)(targets, target => sync(target, options));

// Aliases
export const async = promise;
export const cb = callback;

// Export sync version by default
export default sync;
