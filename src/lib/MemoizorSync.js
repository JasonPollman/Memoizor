/**
 * Contains the MemoizorSync class, which memoizes synchronous functions
 * that directly return values.
 * @file
 */

import { md5Sync, stringifySync } from 'json-normalize';
import Memoizor from './Memoizor';

/**
 * Memoizes regular synchronous functions.
 * @class MemorizrSync
 * @extends {Memoizor}
 * @export
 */
export default class MemoizorSync extends Memoizor {
  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return (...args) => {
      // Look for cached value
      const resolvedArguments = this.resolveArguments(args);
      const key = this.key(...resolvedArguments);
      const cached = this.get(key, resolvedArguments);
      if (cached !== undefined) return cached;

      // No cache, execute the function and store the results
      const results = this.target(...args);
      this.save(key, results, resolvedArguments);
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
  key(...args) {
    return md5Sync({
      prefix: this.uniqueIdentifier,
      signature: stringifySync(args, MemoizorSync.FUNCTION_KEY_REPLACER),
    });
  }

  /**
   * Gets a cached value.
   * @param {string} key The key of the assoicated value to get.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  get(key, args) {
    const cached = this.onRetrieve(key, args, this);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {string} key The key of the assoicated value to save.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  save(key, value, args) {
    this.onSave(key, value, args, this);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {string} key The key of the assoicated value to delete.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  delete(key, args) {
    this.onDelete(key, args, this);
    return this;
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
