import _ from 'lodash';
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
      const key = await this.key(...this.resolveArguments(args));
      const cached = await this.get(key);
      if (cached !== undefined) return cached;
      return await this.save(key, await this.target(...args));
    };
  }

  /**
   * Gets a cached value.
   * @param {string} key The key of the assoicated value to get.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async get(key) {
    const cached = await this.onRetrieve(key, this);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {string} key The key of the assoicated value to save.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async save(key, value) {
    await this.onSave(key, value, this);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {string} key The key of the assoicated value to delete.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrPromise
   */
  async delete(key) {
    await this.onDelete(key, this);
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

