/**
 * Contains the LocalStorageController class, which is a process-local
 * storage controller that uses a plain object to store memoized results.
 * @file
 */

import StorageController from './StorageController';

const has = Object.prototype.hasOwnProperty;

/**
 * Used to privatize members of the LocalStorageController class.
 * @type {symbol}
 */
const ps = Symbol();

/**
 * A process-local, in-memory storage controller that uses a plain object to store memoized
 * execution results.
 * @class LocalMapStorageController
 * @extends {StorageController}
 * @export
 */
export default class LocalMapStorageController extends StorageController {
  constructor() {
    super();

    // Defines the local store object.
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: { store: new Map() },
    });
  }

  /**
   * The LocalStorageController save implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {any} value The value produced by the memoized function.
   * @returns {any} The valued passed in.
   * @override
   */
  save(key, value) {
    this[ps].store.set(key, value);
    return value;
  }

  /**
   * The LocalStorageController retrieve implementation.
   * @param {string} key The unique key for the arguments signature.
   * @returns {undefined}
   * @override
   */
  retrieve(key, args, memoizor) {
    return this[ps].store.has(key) ? this[ps].store.get(key) : memoizor.NOT_CACHED;
  }

  /**
   * The LocalStorageController delete implementation.
   * @param {string} key The unique key for the arguments signature.
   * @returns {undefined}
   * @override
   */
  delete(key) {
    const stored = this[ps].store.get(key);
    this[ps].store.delete(key);
    return stored;
  }

  /**
   * The LocalStorageController empty implementation.
   * @param {string} key The unique key for the arguments signature.
   * @returns {undefined}
   * @override
   */
  empty() {
    this[ps].store.clear();
  }

  /**
   * The LocalStorageController contents implementation.
   * @returns {MapIterator} A copy of the store contents.
   * @override
   */
  contents() {
    return this[ps].store.values();
  }
}
