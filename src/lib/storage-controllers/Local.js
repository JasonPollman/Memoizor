/**
 * Contains the LocalStorageController class, which is a process-local
 * storage controller that uses a plain object to store memoized results.
 * @file
 */

import _ from 'lodash';
import StorageController from './StorageController';

/**
 * Used to privatize members of the LocalStorageController class.
 * @type {symbol}
 */
const ps = Symbol();

/**
 * A process-local, in-memory storage controller that uses a plain object to store memoized
 * execution results.
 * @class LocalStorageController
 * @extends {StorageController}
 * @export
 */
export default class LocalStorageController extends StorageController {
  constructor() {
    super();

    // Defines the local store object.
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: { store: {} },
    });
  }

  /**
   * The LocalStorageController save implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {any} value The value produced by the memoized function,
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * given the "signature" defined by "key".
   * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
   * @returns {undefined}
   * @override
   */
  save(key, value, args, memorizr, done) {
    this[ps].store[key] = value;
    if (_.isFunction(done)) done(null, value);
    return value;
  }

  /**
   * The LocalStorageController retrieve implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
   * @returns {undefined}
   * @override
   */
  retrieve(key, args, memorizr, done) {
    if (_.isFunction(done)) done(null, this[ps].store[key]);
    return this[ps].store[key];
  }

  /**
   * The LocalStorageController delete implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
   * @returns {undefined}
   * @override
   */
  delete(key, args, memorizr, done) {
    if (this[ps].store[key]) this[ps].store[key] = undefined;
    if (_.isFunction(done)) done(null);
  }

  /**
   * The LocalStorageController empty implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
   * @returns {undefined}
   * @override
   */
  empty(memorizr, done) {
    this[ps].store = {};
    if (_.isFunction(done)) done(null);
  }
}
