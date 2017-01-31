/**
 * Formats the exports and adds the .all functionality.
 * @file
 */

import _ from 'lodash';
import * as controllers from './storage-controllers';
import MemoizorPromise from './MemoizorPromise';
import MemoizorCallback from './MemoizorCallback';
import MemoizorSync from './MemoizorSync';

const has = Object.prototype.hasOwnProperty;

/**
 * Used to spread into Object.defineProperties
 * @type {object<boolean>}
 */
const descriptor = {
  configurable: true,
  enumerable: false,
  writable: true,
};

/**
 * Creates a decorator.
 * @param {function} fn The memoization function to reassign the prototype function to.
 * @returns {function} A decorator function.
 */
function generateDecorator(fn) {
  return options => (Target, key) => {
    const method = Target[key];
    const T = Target;

    T[key] = function prototypeMethodWrapper(...args) {
      const wrapper = params => method.apply(this, params);
      Object.defineProperty(wrapper, 'name', { value: method.name });

      const memoized = fn(wrapper, options);
      Object.defineProperty(this, key, { ...descriptor, value: memoized });
      return this[key](...args);
    };

    // Rename the prptotype wrapper function to its original name
    Object.defineProperty(T[key], 'name', { value: method.name });
    return Target;
  };
}

/**
 * Generates a "non decorator" way of memoizing class methods.
 * This is a wrapper around generateDecorator().
 * @param {function} fn The function to use to generate the "non decorator" function with.
 */
function generateNonDecorator(fn) {
  return (prototype, method, options) => generateDecorator(fn)(options)(prototype, method);
}

/**
 * Memoizes functions that return promises.
 * @param {function} target The target function to memoize.
 * @param {object} options Various options for setting up the memoization.
 * @returns {function} The memoized function.
 * @export
 */
export function promise(target, options) {
  if (has.call(target, 'memoizor')) return target.setOptions(options);
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
  if (has.call(target, 'memoizor')) return target.setOptions(options);
  return new MemoizorCallback(target, options).memoized;
}

/**
 * Memoizes regular ole' synchronous functions.
 * @param {function} target The target function to memoize.
 * @param {object} options Various options for setting up the memoization.
 * @returns {function} The memoized function.
 * @export
 */
export function sync(target, options) {
  if (has.call(target, 'memoizor')) return target.setOptions(options);
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

// Memoizes an array or plain object of functions...
promise.all = function memoizeAllPromiseFunctions(targets, options) {
  return mappingFn(targets)(targets, target =>
    (_.isFunction(target) ? promise(target, options) : target));
};

callback.all = function memoizeAllCallbackFunctions(targets, options) {
  return mappingFn(targets)(targets, target =>
    (_.isFunction(target) ? callback(target, options) : target));
};

sync.all = function memoizeAllSyncFunctions(targets, options) {
  return mappingFn(targets)(targets, target =>
    (_.isFunction(target) ? sync(target, options) : target));
};

/**
 * A decorator to apply the sync memoizor function to class methods.
 * @function
 */
export const memoize = generateDecorator(sync);

/**
 * A regular function to apply the sync memoizor function to class methods.
 * @function
 */
export const memoizeMethod = generateNonDecorator(sync);

// Add all function type decorators as properties to the sync decorator
Object.assign(memoize, {
  promise: generateDecorator(promise),
  callback: generateDecorator(callback),
  sync: memoize,
});

// Add all method memoizors to the sync method memoizor.
Object.assign(memoizeMethod, {
  promise: generateNonDecorator(promise),
  callback: generateNonDecorator(callback),
  sync: memoizeMethod,
});

// Aliases
export const async = promise;
export const cb = callback;

// Export all storage controllers
Object.assign(exports, controllers);

// Export sync version by default
export default sync;
