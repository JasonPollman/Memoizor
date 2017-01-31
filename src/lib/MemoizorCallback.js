/**
 * Contains the MemoizorCallback class, which memoizes functions that use callbacks.
 * @file
 */

import _ from 'lodash';
import MemoizorPromise from './MemoizorPromise';

/**
 * Memoizes functions that take callbacks.
 * @class MemorizrCallback
 * @extends {MemoizorPromise}
 * @export
 */
export default class MemoizorCallback extends MemoizorPromise {
  /**
   * Creates an instance of MemoizorCallback.
   * @param {function} target The target function to memoize.
   * @param {object} opts Contains various settings for memoizing the given target.
   * @param {string} mode The mode of the target function (callback, promise, or sync).
   * @memberof MemoizorCallback
   */
  constructor(target, options = {}, mode = 'callback') {
    const opts = _.isPlainObject(options) ? options : {};

    let callbackIndex = parseInt(opts.callbackIndex, 10);
    if (isNaN(callbackIndex) || !isFinite(callbackIndex)) callbackIndex = undefined;

    super(target, {
      ...opts,
      // Validate the callback index is a number
      callbackIndex,
    }, mode);
  }

  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return (...args) => {
      (async () => {
        const callbackIndex = _.isNumber(this.callbackIndex)
          ? Math.min(this.callbackIndex, args.length)
          : args.length - 1;

        // Get the list of params with the callback removed.
        const params = [...args];
        let callback = params.splice(callbackIndex, 1)[0];

        // Hmmm, use didn't provide a proper callback
        if (!_.isFunction(callback)) {
          params.push(callback);
          callback = _.noop;
        }

        // Look for cached value
        const resolvedArguments = this.resolveArguments(params);

        const wrappedCallback = (...results) => {
          if (results[0] instanceof Error) return callback(results[0]);
          return this.save(results, resolvedArguments, null, true).then(() => callback(...results));
        };

        // Cache hit
        const cached = await this.get(resolvedArguments, null, true);
        if (cached !== this.NOT_CACHED) return wrappedCallback(...cached);
        params.splice(callbackIndex, 0, wrappedCallback);

        // No cache, execute the function and store the results
        return this.target(...params);
      })();
    };
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  async get(args, done, resolved = false) {
    return await new Promise(async (resolve, reject) => {
      const resolvedArguments = resolved ? args : this.resolveArguments(resolved);
      const key = await this.key(resolvedArguments);
      this.onRetrieve(key, resolvedArguments, (err, cached) => {
        this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== this.NOT_CACHED });
        if (err) reject(err); else resolve(cached);
        done(err, cached);
      });
    });
  }

  /**
   * Stores a cached value.
   * @param {any} value The execution results of the target (memoized) function.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrCallback
   */
  async save(value, args, done, resolved = false) {
    const resolvedArguments = resolved ? args : this.resolveArguments(resolved);
    const key = await this.key(resolvedArguments);
    await this.onSave(key, value, resolvedArguments, done);
    return value;
  }

  /**
   * Deletes a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {function} done A callback for completion.
   * @returns {any} The deleted contents.
   * @memberof MemorizrCallback
   */
  async delete(args, done, resolved = false) {
    const resolvedArguments = resolved ? args : this.resolveArguments(resolved);
    const key = await this.key(resolvedArguments);
    return await this.onDelete(key, resolvedArguments, done);
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrCallback
   */
  async empty(done) {
    await this.onEmpty(done);
    return this;
  }

  /**
   * Returns the target to its "natural", unmemoized state.
   * @param {boolean=} [empty=false] If true, the cache store will be emptied after unmemoizing.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemoizorPromise
   * @override
   */
  async unmemoize(empty = false, done) {
    if (empty) await this.empty(done);
    return super.unmemoize();
  }
}
