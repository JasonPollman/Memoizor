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
   * @param {string} type The type of the target function (callback, promise, or sync).
   * @memberof MemoizorCallback
   */
  constructor(target, options = {}, type = 'callback') {
    const opts = _.isPlainObject(options) ? options : {};

    // Validate the callback index is a number
    let callbackIndex = parseInt(opts.callbackIndex, 10);
    if (isNaN(callbackIndex) || !isFinite(callbackIndex)) callbackIndex = undefined;
    super(target, { ...opts, callbackIndex }, type);
  }

  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return (...args) => {
      let callback;

      (async () => {
        const callbackIndex = _.isNumber(this.callbackIndex)
          ? Math.min(this.callbackIndex, args.length)
          : args.length - 1;

        // Get the list of params with the callback removed.
        const params = [...args];
        callback = params.splice(callbackIndex, 1)[0];

        // Hmmm, use didn't provide a proper callback
        // Process will hang...
        if (!_.isFunction(callback)) params.push(callback);

        // Look for cached value
        const resolvedArguments = this.resolveArguments(params);

        const wrappedCallback = (...results) => {
          if (results[0] instanceof Error) return callback(results[0]);
          return this.save(results, resolvedArguments, null, true)
            .then(() => callback(...results))
            .catch(callback);
        };

        // Cache hit
        const cached = await this.get(resolvedArguments, null, true);
        if (cached !== this.NOT_CACHED) return wrappedCallback(...cached);
        params.splice(callbackIndex, 0, wrappedCallback);

        // No cache, execute the function and store the results
        return this.target(...params);
      })()
      .catch(e => (_.isFunction(callback) ? callback(e) : process.nextTick(() => { throw e; })));
    };
  }

   /**
   * Returns the key for the given argument list.
   * @param {Array<any>} args The argument list signature array.
   * @param {function} done A callback for completion.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof MemoizorCallback
   * @override
   */
  key(args, done) {
    const cb = _.isFunction(done) ? done : _.noop;
    return super.key(args).then(key => cb(null, key)).catch(done);
  }

  /**
   * Gets a cached value.
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  async get(args, done, resolved = false) {
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    return await new Promise(async (resolve, reject) => {
      const resolvedArguments = resolved ? params : this.resolveArguments(params);
      const key = await this.key(resolvedArguments);

      this.onRetrieve(key, resolvedArguments, (err, cached) => {
        this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== this.NOT_CACHED });
        if (err) reject(err); else resolve(cached);
        if (_.isFunction(done)) done(err, cached);
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
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    // We store all callback results as an array, as they can have multiple
    // arguments passed to the callback.
    if (!Array.isArray(params)) params = [params];

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
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
    let params = args;
    if (_.isArguments(params)) params = _.toArray(params);

    const resolvedArguments = resolved ? params : this.resolveArguments(params);
    const key = await this.key(resolvedArguments);
    return await this.onDelete(key, resolvedArguments, (e, ...res) => {
      if (e) done(e); else done(...res);
    });
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
