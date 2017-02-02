/**
 * Contains the MemoizorPromise class, which memoizes functions that use promises.
 * @file
 */

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
   * Creates an instance of MemoizorPromise.
   * @param {function} target The target function to memoize.
   * @param {object} options Options to use in memozing.
   * @param {string} type The type of the target function (callback, promise, or sync).
   * @memberof MemoizorPromise
   */
  constructor(target, options, type = 'promise') {
    super(target, options, type);
  }

  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrPromise
   */
  create() {
    return async (...args) => {
      const resolvedArguments = this.resolveArguments(args);
      const cached = await this.get(resolvedArguments, true);
      if (cached !== this.NOT_CACHED) return cached;
      return await this.save(await this.target(...args), resolvedArguments, true);
    };
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async get(args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = await this.key(resolvedArguments);
    const cached = await this.onRetrieve(key, resolvedArguments);
    this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== this.NOT_CACHED });
    return cached;
  }

  /**
   * Stores a cached value.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The cached value, if it exists.
   * @memberof MemorizrPromise
   */
  async save(value, args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = await this.key(resolvedArguments);
    await this.onSave(key, value, resolvedArguments);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @returns {any} The deleted contents.
   * @memberof MemorizrPromise
   */
  async delete(args, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = await this.key(resolvedArguments);
    return await this.onDelete(key, resolvedArguments);
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
