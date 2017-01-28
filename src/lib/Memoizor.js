/**
 * Contains the Memoizor base class.
 * @file
 */

import _ from 'lodash';
import debuggr from 'debug';
import { md5Async, stringifyAsync } from 'json-normalize';
import { EventEmitter } from 'events';
import StorageController from './storage-controllers/StorageController';
import LocalStorageController from './storage-controllers/Local';

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
 * Wraps the store save function to account for timeouts.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {StorageController} controller The current StorageController instance associated
 * with the given memoizor instance.
 * @returns {function} The wrapped onSave function.
 */
function wrapSave(memoizor, controller) {
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

    return controller.save(key, ...args);
  };
}

/**
 * Wraps the store retrieve function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {StorageController} controller The current StorageController instance associated
 * with the given memoizor instance.
 * @returns {function} The wrapped onRetrieve function.
 */
function wrapRetrieve(memoizor, controller) {
  return (key, ...args) => {
    const mem = memoizor;
    const { storeKeyFrequencies, maxRecords } = mem;

    mem.emit('retrieve', key, ...args);
    mem.debug({ method: 'retrieve', function: mem.name, key });

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      storeKeyFrequencies[key].frequency++;
      storeKeyFrequencies[key].lastAccess = Date.now();
    }

    return controller.retrieve(key, ...args);
  };
}

/**
 * Wraps the store delete function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {StorageController} controller The current StorageController instance associated
 * with the given memoizor instance.
 * @returns {function} The wrapped onDelete function.
 */
function wrapDelete(memoizor, controller) {
  return (key, ...args) => {
    const mem = memoizor;
    const { storeKeyFrequencies, maxRecords } = mem;

    mem.debug({ method: 'delete', function: mem.name, key });
    mem.emit('delete', key, ...args);

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      delete storeKeyFrequencies[key];
      mem[ps].storeCurrentRecords--;
    }

    return controller.delete(key, ...args);
  };
}

/**
 * Wraps the store empty function to account for max lookups.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {StorageController} controller The current StorageController instance associated
 * with the given memoizor instance.
 * @returns {function} The wrapped onEmpty function.
 */
function wrapEmpty(memoizor, controller) {
  return (...args) => {
    const mem = memoizor;

    mem.debug({ method: 'empty', function: mem.name });
    mem.emit('empty', ...args);
    mem.emit('clear', ...args);

    if (_.isNumber(mem.maxRecords)) {
      mem[ps].storeKeyFrequencies = {};
      mem[ps].storeCurrentRecords = 0;
    }

    return controller.empty(...args);
  };
}

/**
 * Properties to ignore decorating the Memoize instance with.
 * @type {Array<string>}
 */
const IGNORED_PROPERTIES = ['wrapStorageController', 'resolveArguments', 'debug'];

/**
 * Used to spread into Object.defineProperties.
 * @type {object<boolean>}
 */
const descriptor = {
  configurable: false,
  writable: false,
  enumerable: true,
};

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
    if (_.isFunction(method) && !decorated[property] && !_.includes(IGNORED_PROPERTIES, property)) {
      Object.defineProperty(decorated, property, {
        ...descriptor,
        value: method.bind(memoizor),
      });
    }
  });

  if (prototype !== RootPrototype) decorate(RootPrototype, memoizor, decorated, prototype);

  // Add a connection to the memoizor instance.
  Object.defineProperty(decorated, 'memoizor', { ...descriptor, value: memoizor });
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

    // Validate target argument
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

    // Validate resolver(s?) option
    const resolvers = options.resolvers = options.resolvers || options.resolver;

    if (!_.isUndefined(resolvers)
      && ((!_.isFunction(resolvers) && !Array.isArray(resolvers))
        || (Array.isArray(resolvers) && !resolvers.every(fn => _.isFunction(fn))))) {
      throw new TypeError('The "resolver/resolvers" option must be a function or an array of functions!');
    }

    // Protected properties
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        ...options,

        /**
         * The storage mechanism for storing data.
         * @type {StorageController}
         */
        storage: null,

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

        onSave: null,
        onRetrieve: null,
        onDelete: null,
        onEmpty: null,
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

    // Setup the storage controller
    this.setStorageController(options.storageController || new LocalStorageController());

    // Create the memoized target
    const memoized = this.create();

    this[ps].memoized = this[ps].callable = decorate(Memoizor.prototype, this, (...args) => {
      if (this.callable === this.target) return target(...args);
      return memoized(...args);
    });
  }

  /**
   * Wraps (mixes in) added functionality to the storage controller functions and
   * assigns the wrapped functions to the Memoizor instance.
   * @param {StorageController} controller The StorageController instance to wrap.
   * @returns {Memoizor} The current Memoizor instance.
   */
  wrapStorageController(controller) {
    // Wrap handler functions
    this[ps].onSave = wrapSave(this, controller);
    this[ps].onRetrieve = wrapRetrieve(this, controller);
    this[ps].onDelete = wrapDelete(this, controller);
    this[ps].onEmpty = wrapEmpty(this, controller);
    return this;
  }

  /**
   * Sets the current StorageController.
   * @param {StorageController} controller The StorageController instance to wrap.
   * @returns {Memoizor} The current Memoizor instance.
   */
  setStorageController(controller) {
    if (!(controller instanceof StorageController)) {
      throw new TypeError('The storage controller must be an instance of StorageController');
    }

    this[ps].storage = controller;
    this.wrapStorageController(controller);
    return this;
  }

  /**
   * Alias for Memoizor#empty.
   * @param {...any} args The arguments to pass through to Memoizor#empty().
   */
  clear(...args) {
    return this.empty(...args);
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
    this.emit('disable');

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
    this.emit('enable');

    this[ps].callable = this.memoized;
    return this;
  }

  /**
   * Alias for memoize.
   * @returns {function}
   * @memberof Memoizor
   */
  get enable() {
    return this.memoize;
  }

  /**
   * Alias for unmemoize.
   * @returns {function}
   * @memberof Memoizor
   */
  get disable() {
    return this.unmemoize;
  }

  /**
   * Used to resolve the maximum arguments length option and calls the options.resolvers
   * resolver functions.
   * @param {Array<any>} args The arguments to process.
   * @returns {Array<any>} The processed arguments.
   */
  resolveArguments(args) {
    const slicedArgs = (_.isNumber(this.maxArgs) ? args.slice(0, this.maxArgs) : args);
    let resolvedArgs = slicedArgs;

    if (this.resolvers) {
      resolvedArgs = slicedArgs.map((arg, idx) => {
        if (_.isFunction(this.resolvers)) return this.resolvers(arg, idx, this);
        if (this.resolvers[idx]) return this.resolvers[idx](arg, idx, this);
        return arg;
      });
    }

    return resolvedArgs;
  }
}
