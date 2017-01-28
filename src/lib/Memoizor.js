import _ from 'lodash';
import debuggr from 'debug';

import { md5Async, stringifyAsync } from 'json-normalize';
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
function defaultSaveHandler(key, value, memorizr, done) {
  const container = memorizr;
  container.localStorage[key] = value;
  if (_.isFunction(done)) done(null, value);
  return value;
}

/**
 * The default store retrieve function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultRetrieveHandler(key, memorizr, done) {
  if (_.isFunction(done)) done(null, memorizr.localStorage[key]);
  return memorizr.localStorage[key];
}

/**
 * The default store delete function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultDeleteHandler(key, memorizr, done) {
  const container = memorizr;
  if (container.localStorage[key]) container.localStorage[key] = undefined;
  if (_.isFunction(done)) done(null);
}

/**
 * The default store empty function.
 * @param {string} key The unique key for the arguments signature.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @returns {undefined}
 */
function defaultEmptyHandler(memorizr, done) {
  const container = memorizr;
  container[ps].localStorage = {};
  if (_.isFunction(done)) done(null);
}

/**
 * Wraps the store save function to account for timeouts.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {function} save The "onSave" function.
 * @returns {function} The wrapped onSave function.
 */
function wrapSave(memoizor, saver) {
  return (key, ...args) => {
    const mem = memoizor;
    const { ttl, storeKeyFrequencies, maxRecords, LRUPercentPadding, LRUHistoryFactor } = mem;

    mem.debug({ method: 'save', function: mem.name, key });
    mem.emit('save', key, ...args);

    // Delete stored item after the TTL has expired
    if (_.isNumber(ttl)) {
      setTimeout(() => {
        debug('Timeout triggered for key %s', key);
        mem.delete(key);
      }, ttl);
    }

    // If the number of max allowable records is set, adjust if overflowing
    if (_.isNumber(maxRecords)) {
      if (!storeKeyFrequencies[key]) {
        storeKeyFrequencies[key] = {
          key,
          frequency: 0,
          lastAccess: Number.MAX_VALUE,
        };
      }

      // Increment total records and accesses for the current key.
      mem[ps].storeCurrentRecords++;

      // Stored records overflow the total allowable
      if (mem.storeCurrentRecords > maxRecords) {
        const frequencyList = _.toArray(storeKeyFrequencies);
        const percentPad = LRUPercentPadding || 10;
        const count = frequencyList.length;

        // Determine the LRU store items.
        // If the value of LRUPercentPadding > 1, we'll add more space to allow for additional calls
        // without invoking all this logic again.
        let lrus = frequencyList
          .sort((a, b) => (b.lastAccess - a.lastAccess))
          .slice(0, count / (LRUHistoryFactor || 2))
          .sort((a, b) => (a.frequency - b.frequency));

        const deleteCount = Math.ceil((percentPad * 0.01) * lrus.length);
        lrus = lrus.slice(0, deleteCount);

        debug('Store too large (exceeds %s), reducing store by %s%% (%s record(s))', mem.maxRecords, percentPad, deleteCount);
        lrus.forEach((lru) => {
          // Delete the store item, decrement the total records
          debug('Deleting LRU value with key: %s (%s lookup(s))', lru.key, lru.frequency);
          delete storeKeyFrequencies[lru.key];
          mem[ps].storeCurrentRecords--;
          mem.delete(lru.key);
        });
      }

      debug('Current records count is: %s', mem.storeCurrentRecords);
    }

    return saver(key, ...args);
  };
}

/**
 * Wraps the store retrieve function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {function} retriever The "onRetrieve" function.
 * @returns {function} The wrapped onRetrieve function.
 */
function wrapRetrieve(memoizor, retriever) {
  return (key, ...args) => {
    const mem = memoizor;
    const { storeKeyFrequencies, maxRecords } = mem;

    mem.emit('retrieve', key, ...args);
    mem.debug({ method: 'retrieve', function: mem.name, key });

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      storeKeyFrequencies[key].frequency++;
      storeKeyFrequencies[key].lastAccess = Date.now();
    }

    return retriever(key, ...args);
  };
}

/**
 * Wraps the store delete function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {function} deleter The "onDelete" function.
 * @returns {function} The wrapped onDelete function.
 */
function wrapDelete(memoizor, deleter) {
  return (key, ...args) => {
    const mem = memoizor;
    const { storeKeyFrequencies, maxRecords } = mem;

    mem.debug({ method: 'delete', function: mem.name, key });
    mem.emit('delete', key, ...args);

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      delete storeKeyFrequencies[key];
      mem[ps].storeCurrentRecords--;
    }

    return deleter(key, ...args);
  };
}

/**
 * Wraps the store empty function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {function} emptier The "onEmpty" function.
 * @returns {function} The wrapped onEmpty function.
 */
function wrapEmpty(memoizor, emptier) {
  return (...args) => {
    const mem = memoizor;

    mem.debug({ method: 'empty', function: mem.name });
    mem.emit('empty', ...args);

    if (_.isNumber(mem.maxRecords)) {
      mem[ps].storeKeyFrequencies = {};
      mem[ps].storeCurrentRecords = 0;
    }

    return emptier(...args);
  };
}


/**
 * Decorates the given target function with the associated Memoizor
 * object's bound prototype functions (walks the prototype chain until Memoizor.prototype if found).
 * This gives us the magic of applying the functions of the Memoizor objects to the memoizing
 * function itself without having to do something like: memoizedFunction.memoizor[method], but
 * instead memoizedFunction[method].
 * @param {object} RootPrototype The top level prototype to stop recursing at (i.e. Memoizor).
 * @param {Memoizor} memoizor The Memoizor object associated with the target function.
 * @param {function} target The memoized function to decorate.
 * @param {object} current The current prototype we're "borrowing" functions from.
 * @returns {function} The decorated function.
 */
function decorate(RootPrototype, memoizor, target, current) {
  const decorated = target;
  const prototype = Object.getPrototypeOf(current || memoizor);
  const properties = Object.getOwnPropertyNames(prototype);

  // Iterate over the Memoizor prototype and append the functions to the
  // memoized function.
  properties.forEach((property) => {
    const method = prototype[property];
    if (_.isFunction(method) && !decorated[property]) decorated[property] = method.bind(memoizor);
  });

  if (prototype !== RootPrototype) decorate(RootPrototype, memoizor, decorated, prototype);
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
   * Used by JSONNormalize to replace functions with their stringified value (for caching).
   * @type {function}
   */
  static FUNCTION_KEY_REPLACER = (key, val) => {
    if (!_.isFunction(val)) return val;
    return val.toString();
  };

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
    const options = _.isPlainObject(opts) ? _.clone(opts) : {};

    // Ensure any ttl/maxRecords/length options are numeric
    ['ttl', 'maxRecords', 'maxArgs'].forEach((prop) => {
      if (options[prop]) options[prop] = parseInt(options[prop], 10) || undefined;
    });

    // Clamp min values for these options
    if (_.isNumber(options.ttl)) options.ttl = Math.max(60, options.ttl);
    if (_.isNumber(options.maxRecords)) options.maxRecords = Math.max(0, options.maxRecords);
    if (_.isNumber(options.maxArgs)) options.maxArgs = Math.max(1, options.maxArgs);

    // Protected properties
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        /**
         * Functions for handling storing and deleting memoized results
         */
        onSave: (...args) => defaultSaveHandler(...args, this),
        onRetrieve: (...args) => defaultRetrieveHandler(...args, this),
        onEmpty: (...args) => defaultEmptyHandler(...args, this),
        onDelete: (...args) => defaultDeleteHandler(...args, this),

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
         * The number of times each store item has been retrieved.
         * @type {object<number>}
         */
        storeKeyFrequencies: {},

        /**
         * The number of total store records.
         * @type {number}
         */
        storeCurrentRecords: 0,

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
    const memoized = this.create();

    this[ps].memoized = this[ps].callable = decorate(Memoizor.prototype, this, (...args) => {
      if (this.callable === this.target) return target(...args);
      return memoized(...args);
    });

    // Wrap handler functions
    this[ps].onSave = wrapSave(this, this[ps].onSave);
    this[ps].onRetrieve = wrapRetrieve(this, this[ps].onRetrieve);
    this[ps].onDelete = wrapDelete(this, this[ps].onDelete);
    this[ps].onEmpty = wrapEmpty(this, this[ps].onEmpty);
  }

  /**
   * Sets the value of the "save" handler function.
   * @param {function} handler The store save function to execute when a memoize result is saved.
   * @memberof Memoizor
   */
  set onSave(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onSave must be a function!');
    this[ps].onSave = wrapSave(this, handler);
  }

  /**
   * Sets the value of the "retrieve" handler function.
   * @param {function} handler The store retrieve function
   * to execute when a memoize result is retrieved.
   * @memberof Memoizor
   */
  set onRetrieve(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onRetrieve must be a function!');
    this[ps].onRetrieve = wrapRetrieve(this, handler);
  }

  /**
   * Sets the value of the "delete" handler function.
   * @param {function} handler The store delete function
   * to execute when a memoize result is deleted.
   * @memberof Memoizor
   */
  set onDelete(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onDelete must be a function!');
    this[ps].onDelete = wrapDelete(handler);
  }

  /**
   * Sets the value of the "empty" handler function.
   * @param {function} handler The store empty function
   * to execute when a memoize result is emptied.
   * @memberof Memoizor
   */
  set onEmpty(handler) {
    if (!_.isFunction(handler)) throw new Error('Value of Memoizor#onEmpty must be a function!');
    this[ps].onEmpty = wrapEmpty(handler);
  }

  /**
   * Returns the key for the given argument list signature string.
   * @param {Array<any>} signature An argument list signature string.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof Memoizor
   */
  async key(...args) {
    return await md5Async({
      prefix: this.uniqueIdentifier,
      signature: stringifyAsync(args, Memoizor.FUNCTION_KEY_REPLACER),
    });
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
    this.emit('unmemoize');
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
    this.emit('memoize');
    this[ps].callable = this.memoized;
    return this;
  }
}

