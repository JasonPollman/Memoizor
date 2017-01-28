/**
 * Contains the MemoizorPromise class, which memoizes functions that use promises.
 * @file
 */

import Memoizor from './Memoizor';

/**
 * Memoizes functions that return Promises.
 * @class MemoizorPromise
 * @extends {Memoizor}
 * @export
 */
export default class MemoizorPromise extends Memoizor {
  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrPromise
   */
  create() {
    return async (...args) => {
      const resolvedArguments = this.resolveArguments(args);
      const key = await this.key(...resolvedArguments);
      const cached = await this.get(key, resolvedArguments);
      if (cached !== undefined) return cached;
      return await this.save(key, await this.target(...args), resolvedArguments);
    };
  }

  /**
   * Gets a cached value.
   * @param {string} key The key of the assoicated value to get.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async get(key, args) {
    const cached = await this.onRetrieve(key, args, this);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {string} key The key of the assoicated value to save.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async save(key, value, args) {
    await this.onSave(key, value, args, this);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {string} key The key of the assoicated value to delete.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrPromise
   */
  async delete(key, args) {
    await this.onDelete(key, args, this);
    return this;
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrPromise
   */
  async empty() {
    await this.onEmpty();
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
    if (empty) await this.empty();
    return super.unmemoize();
  }
}
