/**
 * Contains the MemoizorSync class, which memoizes synchronous functions
 * that directly return values.
 * @file
 */

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
   * @param {string} type The type of the target function (callback, promise, or sync).
   * @memberof MemoizorPromise
   */
  constructor(target, options, type = 'sync') {
    super(target, options, type);
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
      const cached = this.get(resolvedArguments, true);
      if (cached !== this.NOT_CACHED) return cached;

      // No cache, execute the function and store the results
      const results = this.target(...args);
      this.save(results, resolvedArguments, true);
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
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    if (this.mode === 'primitive') return params.join('\u0000');
    if (_.isFunction(this.keyGenerator)) return this.keyGenerator(this.uid, params);

    const finalArgs = this.adjustFinalArguments(params);
    const signature = `${this.uid}${stringifySync(finalArgs)}`;
    return this.hashSignature(signature);
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  get(args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = this.key(resolvedArguments);
    const cached = this.onRetrieve(key, resolvedArguments);
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
  save(value, args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = this.key(resolvedArguments);
    this.onSave(key, value, resolvedArguments);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The deleted contents.
   * @memberof MemorizrSync
   */
  delete(args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = this.key(resolvedArguments);
    return this.onDelete(key, resolvedArguments);
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
