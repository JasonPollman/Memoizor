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
   * Creates an instance of MemoizorPromise.
   * @param {function} target The target function to memoize.
   * @param {object} options Options to use in memozing.
   * @param {string} mode The mode of the target function (callback, promise, or sync).
   * @memberof MemoizorPromise
   */
  constructor(target, options, mode = 'promise') {
    super(target, options, mode);
  }

  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrPromise
   */
  create() {
    return async (...args) => {
      const resolvedArguments = this.resolveArguments(args);
      const cached = await this.get(resolvedArguments);
      if (cached !== undefined) return cached;
      return await this.save(await this.target(...args), resolvedArguments);
    };
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async get(args) {
    const key = await this.key(args);
    const cached = await this.onRetrieve(key, args);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async save(value, args) {
    const key = await this.key(args);
    await this.onSave(key, value, args);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrPromise
   */
  async delete(args) {
    const key = await this.key(args);
    await this.onDelete(key, args);
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
