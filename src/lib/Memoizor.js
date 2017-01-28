import _ from 'lodash';
import { md5Async } from 'json-normalize';
import debuggr from 'debug';
import { EventEmitter } from 'events';

const debug = debuggr('memoizor');

/**
 * Used to privatize members of the Memoizor class.
 * @type {symbol}
 */
const ps = Symbol();

/**
 * Converts \\ to / to normalize filepaths between windows and unix systems.
 * @type {RegExp}
 */
const BACKSLASHES_TO_FORWARD_SLASHES = /\\/g;

/**
 * The default store save function.
 * @param {string} key The unique key for the arguments signature.
 * @param {any} value The value produced by the memoized function,
 * given the "signature" defined by "key".
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultSaveHandler(key, value, memorizr) {
  const container = memorizr;
  container.localStorage[key] = value;
}

/**
 * The default store retrieve function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultRetrieveHandler(key, memorizr) {
  return memorizr.localStorage[key];
}

/**
 * The default store delete function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultDeleteHandler(key, memorizr) {
  const container = memorizr;
  if (container.localStorage[key]) container.localStorage[key] = undefined;
}

/**
 * The default store empty function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultEmptyHandler(memorizr) {
  const container = memorizr;
  container[ps].localStorage = {};
}


/**
 * Decorates the given target function with the associated Memoizor
 * object's bound prototype functions.
 * @param {Memoizor} memoizor The Memoizor object associated with the target function.
 * @param {function} target The memoized function to decorate.
 * @returns {function} The decorated function.
 */
function decorate(memoizor, target) {
  const decorated = target;
  const prototype = memoizor.constructor.prototype;
  const properties = Object.getOwnPropertyNames(prototype);

  // Iterate over the Memoizor prototype and append the functions to the
  // memoized function.
  properties.forEach((property) => {
    const method = prototype[property];
    if (_.isFunction(method)) decorated[property] = method.bind(memoizor);
  });

  return decorated;
}

/**
 * A representation of a memoized function and it's various methods.
 * @class Memorizr
 * @extends {EventEmitter}
 * @export
 */
export default class Memoizor extends EventEmitter {
  /**
   * Creates an instance of Memoizor.
   * @param {function} target The target function to memoize.
   * @param {object} opts Contains various settings for memoizing the given target.
   * @memberof Memoizor
   */
  constructor(target, opts) {
    super();

    // Validate arguments
    if (!_.isFunction(target)) throw new TypeError('Cannot memoize non-function!');
    const options = _.isPlainObject(opts) ? opts : {};

    // Protected properties
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        /**
         * Functions for handling storing and deleting memoized results
         */
        onSave: (...args) => defaultSaveHandler(...args, this),
        onEmpty: (...args) => defaultEmptyHandler(...args, this),
        onDelete: (...args) => defaultDeleteHandler(...args, this),
        onRetrieve: (...args) => defaultRetrieveHandler(...args, this),

        ...options, // Override with user functions

        /**
         * The target function's name for debugging and caching prefixes.
         * @type {string}
         */
        name: target.name || 'anonymous',

        /**
         * The original function.
         * @type {function}
         */
        target,

        /**
         * The memoized function.
         * @type {function}
         */
        memoized: null,

        /**
         * Either "target" or "memoized", based on the current state (whether the function
         * is currently memoized or not).
         * @type {function}
         */
        callable: null,

        /**
         * Local storage, which is used by the default storage handlers.
         * @type {object<any>}
         */
        localStorage: {},

        /**
         * An object, that when serialized will uniquely identify this function.
         * This is used when generating the store keys, but is lax enough to work distributedly.
         * @type {object<string>}
         */
        uniqueIdentifier: {
          application: 'MEMOIZOR',
          main: require.main.filename.replace(BACKSLASHES_TO_FORWARD_SLASHES, '/'),
          function: this.name,
        },
      },
    });

    // Create a getter for each protected function
    _.each(this[ps], (value, key) => {
      Object.defineProperty(this, key, {
        configurable: false,
        enumerable: false,
        get: () => this[ps][key],
      });
    });

    // Create the memoized target
    this[ps].memoized = this[ps].callable = decorate(this, this.create());
  }

  /**
   * Sets the value of the "save" handler function.
   * @param {function} handler The store save function to execute when a memoize result is saved.
   * @memberof Memoizor
   */
  set onSave(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onSave must be a function!');
    this[ps].onSave = handler;
  }

  /**
   * Sets the value of the "retrieve" handler function.
   * @param {function} handler The store retrieve function
   * to execute when a memoize result is retrieved.
   * @memberof Memoizor
   */
  set onRetrieve(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onRetrieve must be a function!');
    this[ps].onRetrieve = handler;
  }

  /**
   * Sets the value of the "delete" handler function.
   * @param {function} handler The store delete function
   * to execute when a memoize result is deleted.
   * @memberof Memoizor
   */
  set onDelete(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onDelete must be a function!');
    this[ps].onDelete = handler;
  }

  /**
   * Sets the value of the "empty" handler function.
   * @param {function} handler The store empty function
   * to execute when a memoize result is emptied.
   * @memberof Memoizor
   */
  set onEmpty(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onEmpty must be a function!');
    this[ps].onEmpty = handler;
  }

  /**
   * Returns the key for the given argument list signature string.
   * @param {Array<any>} signature An argument list signature string.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof Memoizor
   */
  async key(signature) {
    return await md5Async({ prefix: this.uniqueIdentifier, signature });
  }

  /**
   * Wrapper for the debug module for internal use.
   * @param {object} object The object to debug.
   * @returns {Memoizor} The current Memoizor instance.
   */
  debug(object) {
    debug('%o', object);
    return this;
  }

  /**
   * Returns the target to its "natural", unmemoized state.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof Memoizor
   */
  unmemoize() {
    if (this.memoized !== this.callable) return this;
    this.debug({ method: 'unmemoize', function: this.name });
    this[ps].callable = this.target;
    return this;
  }

  /**
   * Returns the target to its "natural", unmemoized state.
   * @returns {Memoizor} The current Memoizor instance.
   * @memberof Memoizor
   */
  memoize() {
    if (this.memoized === this.callable) return this;
    this.debug({ method: 'memoize', function: this.name });
    this[ps].callable = this.memoized;
    return this;
  }
}

