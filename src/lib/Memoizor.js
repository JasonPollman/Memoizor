/**
 * Contains the Memoizor base class.
 * @file
 */

import _ from 'lodash';
import debuggr from 'debug';
import crypto from 'crypto';
import { stringifyAsync } from 'json-normalize';
import { EventEmitter } from 'events';
import StorageController from './storage-controllers/StorageController';
import LocalStorageController from './storage-controllers/LocalStorageController';

const debug = debuggr('memoizor');
const has = Object.prototype.hasOwnProperty;

let objectUIDS = 0;
const OBJECT_UID = Symbol();

/**
 * Used to privatize members of the Memoizor class.
 * @type {symbol}
 */
const ps = Symbol();

/**
 * Converts \\ to / to normalize filepaths between windows and unix systems.
 * @type {RegExp}
 */
const BACKSLASHES_G = /\\/g;

/**
 * Converts a process.hrtime tuple to nanoseconds.
 * @param {Array<number>} hrtime A process.hrtime tuple.
 * @returns {number} The hrtime value in nanoseconds.
 */
function toNanoseconds(hrtime) {
  return (hrtime[0] * 1e9) + hrtime[1];
}

/**
 * Wraps the store save function to account for timeouts.
 * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
 * @param {StorageController} controller The current StorageController instance associated
 * with the given memoizor instance.
 * @returns {function} The wrapped onSave function.
 */
function wrapSave(memoizor, controller) {
  return (key, value, args, done) => {
    const mem = memoizor;

    mem.debug({ method: 'save', function: mem.name, key });
    mem.emit('save', key, value, args);

    // If the number of max allowable records is set, adjust if overflowing
    if (_.isNumber(mem.maxRecords)) {
      const { storeKeyFrequencies, LRUPercentPadding, LRUHistoryFactor } = mem;

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
      if (mem.storeCurrentRecords > mem.maxRecords) {
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

        mem.emit('overflow', lrus.map(lru => lru.key));
        debug('Store too large (exceeds %s), reducing store by %s%% (%s record(s))', mem.maxRecords, percentPad, deleteCount);
        // Delete the store item, decrement the total records
        lrus.forEach((lru) => {
          debug('Deleting LRU value with key: %s (%s lookup(s))', lru.key, lru.frequency);
          mem.delete(lru.key);
        });
      }

      debug('Current records count is: %s', mem.storeCurrentRecords);
    }

    const results = controller.save(key, value, args, mem);
    if (_.isNumber(mem.ttl)) mem.storeCreated[key] = toNanoseconds(process.hrtime());
    if (_.isFunction(done)) done(null, results);
    return results;
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
  return (key, args, done) => {
    const mem = memoizor;
    const { ttl, storeKeyFrequencies, maxRecords } = mem;

    mem.emit('retrieve', key, args);
    mem.debug({ method: 'retrieve', function: mem.name, key });

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      storeKeyFrequencies[key].frequency++;
      storeKeyFrequencies[key].lastAccess = toNanoseconds(process.hrtime());
    }

    // Delete stored item after the TTL has expired
    if (_.isNumber(ttl)) {
      const created = memoizor.storeCreated[key];
      if (created && toNanoseconds(process.hrtime()) - created > ttl) {
        debug('Timeout exceeded for key %s, deleting...', key);
        const deleted = mem.delete(args, () => { if (_.isFunction(done)) done(null, undefined); });
        mem.emit('retrieved', key, undefined, args);
        if (_.isFunction(deleted.then)) return deleted.then(() => undefined);
        return undefined;
      }
    }

    const results = controller.retrieve(key, args, mem);
    mem.emit('retrieved', key, results, args);
    if (_.isFunction(done)) done(null, results);
    return results;
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
  return (key, args, done) => {
    const mem = memoizor;
    const { storeKeyFrequencies, maxRecords } = mem;
    if (_.isNumber(mem.ttl)) mem.storeCreated[key] = undefined;

    mem.debug({ method: 'delete', function: mem.name, key });
    mem.emit('delete', key, args);

    if (_.isNumber(maxRecords) && storeKeyFrequencies[key]) {
      storeKeyFrequencies[key] = undefined;
      mem[ps].storeCurrentRecords--;
    }

    const results = controller.delete(key, args, mem);

    // Remove crypto key cache for this, this also verifies that the store key existed.
    const signature = mem.cryptoCache.hashes[key];

    if (signature) {
      mem.cryptoCache.hashes[key] = undefined;
      mem.cryptoCache.signatures[signature] = undefined;

      mem.debug({ method: 'deleted', function: mem.name, key });
      mem.emit('deleted', key, results, args);
    }

    if (_.isFunction(done)) done(null, results);
    return results;
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
  return (done) => {
    const mem = memoizor;

    mem.debug({ method: 'empty', function: mem.name });
    mem.emit('empty');
    mem.emit('clear');

    if (_.isNumber(mem.maxRecords)) {
      mem[ps].storeKeyFrequencies = {};
      mem[ps].storeCurrentRecords = 0;
    }

    // Empty the crypto cache
    mem[ps].cryptoCache.hashes = {};
    mem[ps].cryptoCache.signatures = {};

    const results = controller.empty(mem);
    if (_.isFunction(done)) done(null, results);
    return results;
  };
}

/**
 * Properties to ignore decorating the Memoize instance with.
 * @type {Array<string>}
 */
const IGNORED_PROPERTIES = [
  'wrapStorageController',
  'create',
  'validateOptions',
  'debug',
  'hashSignature',
];

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

  Object.defineProperties(decorated, {
    // The type of the function
    type: { ...descriptor, value: memoizor.type },
    // Add a connection to the memoizor instance.
    memoizor: { ...descriptor, value: memoizor },
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
   * Used to indicate that a cache lookup was not cached so we can cache "undefined".
   * @type {symbol}
   */
  static NOT_CACHED = Symbol('MEMOIZOR_NOT_CACHED');

  /**
   * Creates an instance of Memoizor.
   * @param {function} target The target function to memoize.
   * @param {object} opts Contains various settings for memoizing the given target.
   * @param {string} type The type of the target function (callback, promise, or sync).
   * @memberof Memoizor
   */
  constructor(target, opts, type) {
    if (!_.isString(type)) throw new TypeError('Missing type');
    super();

    // Validate target argument
    if (!_.isFunction(target)) throw new TypeError('Cannot memoize non-function!');
    const options = this.validateOptions(_.isPlainObject(opts) ? opts : {});

    // Protected properties
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        /**
         * An object, that when serialized will uniquely identify this function.
         * This is used when generating the store keys, but is lax enough to work distributedly.
         * @type {object<string>}
         */
        uid: JSON.stringify({
          application: 'MEMOIZOR',
          main: require.main.filename.replace(BACKSLASHES_G, '/'),
          function: this.name,
        }),

        /**
         * Arguments to ignore
         * @type {Array<number>}
         */
        ignoreArgs: null,

        /**
         * The maximum number values allowed to be stored.
         * @type {number}
         */
        maxRecords: null,

        // Overwrite with user values
        ...options,

        /**
         * The type of the target function (callback, promise, or sync).
         * @type {string}
         */
        type,

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
        target: options.bind ? target.bind(options.bind) : target,

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
         * The time each store item was stored.
         * @type {object<number>}
         */
        storeCreated: {},

        /**
         * Used by the default keyGenerators
         * @type object
         */
        cryptoCache: {
          hashes: {},
          signatures: {},
        },

        // Wrapped and called internally by each subclass
        // e.g. promise, callback, sync
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
    const wrapper = (...args) =>
      (this.callable === this.target ? this.target(...args) : memoized(...args));

    Object.defineProperty(wrapper, 'name', { value: this.name });
    this[ps].memoized = this[ps].callable = decorate(Memoizor.prototype, this, wrapper);
  }

  /**
   * An outlet for the static verison.
   * @returns {symbol} The "not cached" identifier.
   */
  get NOT_CACHED() {
    return Memoizor.NOT_CACHED;
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
   * Clones the provided user options object and validates/mutates each option.
   * @param {object} opts The options to validate/mutate.
   * @returns {object} The sanitized options.
   */
  validateOptions(opts) {
    const options = _.clone(opts);

    // Check that uid is a string
    if (!_.isUndefined(options.uid) && !_.isString(opts.uid)) {
      throw new TypeError('Memoizor: options.uid must be a string!');
    }

    // Check that keyGenerator is a function
    if (!_.isUndefined(options.keyGenerator) && !_.isFunction(opts.keyGenerator)) {
      throw new TypeError('Memoizor: options.keyGenerator must be a function!');
    }

    // Ensure any ttl/maxRecords/length options are numeric
    ['ttl', 'maxRecords', 'maxArgs', 'LRUPercentPadding', 'LRUHistoryFactor'].forEach((prop) => {
      const parsed = parseInt(options[prop], 10);
      if (options[prop]) options[prop] = _.isNumber(parsed) && !isNaN(parsed) ? parsed : undefined;
    });

    // Clamp min values for these options, convert ttl to nanoseconds
    if (_.isNumber(options.ttl)) options.ttl = Math.max(60, options.ttl) * 1000000;
    if (_.isNumber(options.maxRecords)) options.maxRecords = Math.max(0, options.maxRecords);
    if (_.isNumber(options.maxArgs)) options.maxArgs = Math.max(1, options.maxArgs);

    if (_.isNumber(options.LRUPercentPadding)) {
      options.LRUPercentPadding = Math.max(1, options.LRUPercentPadding);
    }

    // Validate options.ignoreArgs
    if (!_.isUndefined(options.ignoreArgs)) {
      if (!Array.isArray(options.ignoreArgs)) throw new TypeError('Memoizor: options.ignoreArgs must be an array!');

      // Map the array to integer parsed values and validate that they're all numbers
      options.ignoreArgs = options.ignoreArgs.map((val) => {
        const numeric = parseInt(val, 10);
        if (isNaN(numeric) || !isFinite(numeric)) throw new Error('Values of options.ignoreArgs must be finite numbers!');
        return numeric;
      });
    }

    // Validate resolver(s?) option
    const coerceArgs = options.coerceArgs;

    if (!_.isUndefined(coerceArgs)
      && ((!_.isFunction(coerceArgs) && !Array.isArray(coerceArgs))
        || (Array.isArray(coerceArgs) && !coerceArgs.every(fn => !fn || _.isFunction(fn))))) {
      throw new TypeError('The "coerceArgs" option must be a function or an array of types: [function, null, undefined]!');
    }

    return options;
  }

  /**
   * Set options on this Memoizor instance.
   * @param {object} options An object with options to set.
   * @returns {Memoizor} The current Memoizor instance.
   */
  setOptions(options, empty = false) {
    if (_.isPlainObject(options)) {
      _.merge(this[ps], this.validateOptions({
        uid: options.uid,
        maxArgs: options.maxArgs,
        ignoreArgs: options.ignoreArgs,
        ttl: options.ttl,
        maxRecords: options.maxRecords,
        coerceArgs: options.coerceArgs,
      }));

      // Must purge store if these are changed
      if (empty && (options.uid || options.keyGenerator || options.coerceArgs)) {
        const emptyResults = this.empty();
        if (_.isFunction(emptyResults.then)) return emptyResults.then(() => this.memoized);
      }
    }

    return this.memoized;
  }

  /**
   * Returns a copy of the store contents.
   * @returns {any} A copy of the store contents.
   */
  storeContents() {
    return this[ps].storage.contents();
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
      throw new TypeError('Storage controllers must be an instance of StorageController');
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
   * Returns the key for the given argument list.
   * @param {Array<any>} args The argument list signature array.
   * @returns {string} The string md5 key for the given argument signature.
   * @memberof Memoizor
   */
  async key(args) {
    if (this.mode === 'primitive') return args.join('\u0000');
    if (_.isFunction(this.keyGenerator)) return this.keyGenerator(this.uid, args);

    const finalArgs = this.adjustFinalArguments(args);
    const signature = `${this.uid}${await stringifyAsync(finalArgs)}`;
    return this.hashSignature(signature);
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
   * @returns {boolean} True if enabled, false otherwise.
   */
  isEnabled() {
    return this.callable === this.memoized;
  }

  /**
   * Used to resolve the maximum arguments length option and calls the options.coerceArgs
   * resolver functions.
   * @param {Array<any>} args The arguments to process.
   * @returns {Array<any>} The processed arguments.
   */
  resolveArguments(args) {
    const params = [...args];
    const slicedArgs = (_.isNumber(this.maxArgs) ? params.slice(0, this.maxArgs) : args);
    let resolvedArgs = slicedArgs;

    // Resolve any arguments using the given coerceArgs functions
    if (this.coerceArgs) {
      resolvedArgs = slicedArgs.map((arg, idx) => {
        if (_.isFunction(this.coerceArgs)) return this.coerceArgs(arg, idx, this);
        if (this.coerceArgs[idx]) return this.coerceArgs[idx](arg, idx, this);
        return arg;
      });
    }

    // Strip out any ignored args
    if (this.ignoreArgs) {
      resolvedArgs = _.compact(resolvedArgs.map((arg, idx) =>
        (_.includes(this.ignoreArgs, idx) ? null : arg)));
    }

    return resolvedArgs;
  }

  /**
   * Returns a hash for the given signature
   * @param {string} signature The signature to hash.
   * @returns {string} The hex hash.
   * @memberof Memoizor
   */
  hashSignature(signature) {
    if (this.cryptoCache.signatures[signature]) return this.cryptoCache.signatures[signature];
    const hash = crypto.createHash('md5').update(signature).digest('hex');
    this.cryptoCache.signatures[signature] = hash;
    this.cryptoCache.hashes[hash] = signature;
    return hash;
  }

  /**
   * Adjusts arguments for key serialization.
   * @param {Array<any>} args The arguments to adjust.
   * @returns {Arry<any>} The adjusted arguments.
   */
  adjustFinalArguments(args) {
    if (this.mode !== 'reference' && this.mode !== 'dynamic') {
      // Not reference mode, just map functions to their string values
      return args.map(arg => (_.isFunction(arg) ? arg.toString() : arg));
    }

    return args.map((arg) => {
      // Not an object, return original argument
      if (!_.isObject(arg)) return arg;

      // Allow plain objects to be "equal"
      if (this.mode === 'dynamic' && _.isPlainObject(arg)) return arg;

      // Check for object UID, if not attach it
      if (!has.call(arg, OBJECT_UID)) {
        Object.defineProperty(arg, OBJECT_UID, {
          enumerable: false,
          value: `__MEMOIZE__OBJECT__UID__${objectUIDS++}__`,
        });
      }

      return arg[OBJECT_UID];
    });
  }
}
