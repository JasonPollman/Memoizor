import { md5Sync, stringifySync } from 'json-normalize';
import Memoizor from './Memoizor';

/**
 * Memoizes regular syncronous functions.
 * @class MemorizrSync
 * @extends {Memoizor}
 * @export
 */
export default class MemorizrSync extends Memoizor {
  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return (...args) => {
      // Look for cached value
      const cached = this.get(args);
      if (cached !== undefined) return cached;

      // No cache, execute the function and store the results
      const results = this.target(...args);
      this.set(args, results);
      return results;
    };
  }

  /**
   * Returns the key for the given argument list signature string.
   * @param {Array<any>} signature An argument list signature string.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof Memoizor
   * @override
   */
  key(signature) {
    return md5Sync({ prefix: this.uniqueIdentifier, signature });
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} argumentsArray The arguments array to get the associated value of.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  get(argumentsArray) {
    const signature = stringifySync(argumentsArray);
    const key = this.key(signature);
    const cached = this.onRetrieve(key, this);
    this.debug({ method: 'get', function: this.name, signature, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {Array<any>} argumentsArray The arguments array to store the associated value of.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  set(argumentsArray, value) {
    const signature = stringifySync(argumentsArray);
    const key = this.key(signature);
    this.onSave(key, value, this);
    this.debug({ method: 'set', function: this.name, signature });
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} argumentsArray The arguments array associated with
   * a cached value to delete.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  delete(argumentsArray) {
    const signature = stringifySync(argumentsArray);
    const key = this.key(signature);
    this.onDelete(key, this);
    this.debug({ method: 'delete', function: this.name, signature });
    return this;
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  empty() {
    this.onEmpty();
    this.debug({ method: 'empty', function: this.name });
    return this;
  }
}

