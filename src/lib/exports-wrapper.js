import MemoizorPromise from './MemoizorPromise';
import MemoizorCallback from './MemoizorCallback';
import MemoizorSync from './MemoizorSync';

/**
 * Memoizes functions that return promises.
 * @param {function} target The target function to memoize.
 * @returns {function} The memoized function.
 * @export
 */
export function promise(target) {
  return new MemoizorPromise(target).memoized;
}

/**
 * Memoizes functions that return callbacks.
 * @param {function} target The target function to memoize.
 * @returns {function} The memoized function.
 * @export
 */
export function callback(target) {
  return new MemoizorCallback(target).memoized;
}

/**
 * Memoizes regular ole' syncronous functions.
 * @param {function} target The target function to memoize.
 * @returns {function} The memoized function.
 * @export
 */
export function sync(target) {
  return new MemoizorSync(target).memoized;
}

// Extend all exports to default exports.
export default exports;
