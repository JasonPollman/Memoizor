import MemoizorPromise from './MemoizorPromise';

/**
 * Memoizes functions that take callbacks.
 * @class MemorizrCallback
 * @extends {MemoizorPromise}
 * @export
 */
export default class MemoizorCallback extends MemoizorPromise {
  /**
   * Creates the memoized function.
   * @returns {function} The memoized function.
   * @memberof MemorizrSync
   */
  create() {
    return async (...args) => {
      const callback = args[args.length - 1];

      // Look for cached value
      const cached = await this.get(args);
      if (cached !== undefined) return cached;

      // No cache, execute the function and store the results
      return this.target(...args.splice(0, -1), async (err, results) => {
        if (err) return callback(err);

        await this.set(args, results);
        return callback(null, results);
      });
    };
  }
}

