import _ from 'lodash';
import { md5Sync, stringifySync } from 'json-normalize';
import Memoizor from './Memoizor';

/**
 * Memoizes regular syncronous functions.
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
      const key = this.key(...this.resolveArguments(args));
      const cached = this.get(key);
      if (cached !== undefined) return cached;

      // No cache, execute the function and store the results
      const results = this.target(...args);
      this.save(key, results);
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
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  get(key) {
    const cached = this.onRetrieve(key, this);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {string} key The key of the assoicated value to save.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  save(key, value) {
    this.onSave(key, value, this);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {string} key The key of the assoicated value to delete.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  delete(key) {
    this.onDelete(key, this);
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

