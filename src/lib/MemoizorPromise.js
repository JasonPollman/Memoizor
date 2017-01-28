import { stringifyAsync } from 'json-normalize';
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
   * @memberof MemorizrSync
   */
  create() {
    return async (...args) => {
      const cached = await this.get(args);
      if (cached !== undefined) return cached;
      return await this.save(args, await this.target(...args));
    };
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} argumentsArray The arguments array to get the associated value of.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  async get(argumentsArray) {
    const signature = await stringifyAsync(argumentsArray);
    const key = await this.key(signature);
    const cached = await this.onRetrieve(key, this);

    this.debug({ method: 'get', function: this.name, signature, cached: cached !== undefined });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {Array<any>} argumentsArray The arguments array to store the associated value of.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrSync
   */
  async save(argumentsArray, value) {
    const signature = await stringifyAsync(argumentsArray);
    const key = await this.key(signature);
    await this.onSave(key, value, this);

    this.debug({ method: 'set', function: this.name, signature });
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} argumentsArray The arguments array associated with
   * a cached value to delete.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrPromise
   */
  async delete(argumentsArray) {
    const signature = await stringifyAsync(argumentsArray);
    const key = await this.key(signature);
    await this.onDelete(key, this);
    this.debug({ method: 'delete', function: this.name, signature });
    return this;
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  async empty() {
    await this.onEmpty();
    this.debug({ method: 'empty', function: this.name });
    return this;
  }
}

