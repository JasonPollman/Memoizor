/**
 * Contains the MemoizorSync class, which memoizes synchronous functions
 * that directly return values.
 * @file
 */

import crypto from 'crypto';
import _ from 'lodash';
import { stringifySync } from 'json-normalize';
import Memoizor from './Memoizor';

/**
 * Memoizes regular synchronous functions.
 * @class MemorizrSync
 * @extends {Memoizor}
 * @export
 */
export default class MemoizorSync extends Memoizor {
  /**
   * Creates an instance of MemoizorPromise.
   * @param {function} target The target function to memoize.
   * @param {object} options Options to use in memozing.
   * @param {string} mode The mode of the target function (callback, promise, or sync).
   * @memberof MemoizorPromise
   */
  constructor(target, options, mode = 'sync') {
    super(target, options, mode);
  }

  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return (...args) => {
      // Look for cached value
      const resolvedArguments = this.resolveArguments(args);
      const cached = this.get(resolvedArguments);
      if (cached !== this.NOT_CACHED) return cached;

      // No cache, execute the function and store the results
      const results = this.target(...args);
      this.save(results, resolvedArguments);
      return results;
    };
  }

  /**
   * Returns the key for the given argument list signature string.
   * @param {Array<any>} signature An argument list signature string.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof MemoizorSync
   * @override
   */
  key(args) {
    if (args.length === 0) return '';
    if (_.isFunction(this.keyGenerator)) return `${this.uid}${this.keyGenerator(args)}`;

    const finalArgs = args.map(arg => (_.isFunction(arg) ? arg.toString() : arg));
    return crypto.createHash('md5')
      .update(`${this.uid}${stringifySync(finalArgs)}`)
      .digest('hex');
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  get(args) {
    const key = this.key(args);
    const cached = this.onRetrieve(key, args);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== this.NOT_CACHED });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  save(value, args) {
    const key = this.key(args);
    this.onSave(key, value, args);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The deleted contents.
   * @memberof MemorizrSync
   */
  delete(args) {
    const key = this.key(args);
    return this.onDelete(key, args);
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  empty() {
    this.onEmpty();
    return this;
  }

  /**
   * Returns the target to its "natural", unmemoized state.
   * @param {boolean=} [empty=false] If true, the cache store will be emptied after unmemoizing.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemoizorPromise
   * @override
   */
  async unmemoize(empty = false) {
    if (empty) this.empty();
    return super.unmemoize();
  }
}
