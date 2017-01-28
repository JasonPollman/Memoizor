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
   * @memberof MemoizorCallback
   */
  constructor(target, options) {
    super(target, {
      ...options,
      // Validate the callback index is a number
      callbackIndex: parseInt(options.callbackIndex, 10) || undefined,
    });
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
        ? Math.min(this.callbackArgument, args.length)
        : args.length - 1;

        // Get the list of params with the callback removed.
        const params = [...args];
        const callback = params.splice(callbackIndex, 1)[0];

        // Look for cached value
        const key = await this.key(...this.resolveArguments(args));

        const cached = await this.get(key);
        if (cached !== undefined) return cached;

        const wrappedCallback = async (err, results) => {
          if (err) return callback(err);
          await this.save(key, results);
          return callback(null, results);
        };

        // Splice in the wrapped, "new" callback
        const argsCallbackSpliced = params.splice(callbackIndex, 0, wrappedCallback);

        // No cache, execute the function and store the results
        return this.target(...argsCallbackSpliced);
      })();
    };
  }

  /**
   * Gets a cached value.
   * @param {string} key The key of the assoicated value to get.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrSync
   */
  get(key, done) {
    this.onRetrieve(key, this, (err, cached) => {
      this.debug({ method: 'post retrieve', function: this.name, key, cached: cached !== undefined });
      return done(err, cached);
    });

    return this;
  }

  /**
   * Stores a cached value.
   * @param {string} key The key of the assoicated value to save.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrCallback
   */
  async save(key, value, done) {
    this.onSave(key, value, this, done);
    return this;
  }

  /**
   * Deletes a cached value.
   * @param {string} key The key of the assoicated value to delete.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrCallback
   */
  async delete(key, done) {
    this.onDelete(key, this, done);
    return this;
  }

  /**
   * Empties all stored values for the memoized function associated with this Memoizor object.
   * @param {function} done A callback for completion.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof MemorizrCallback
   */
  async empty(done) {
    this.onEmpty(done);
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
