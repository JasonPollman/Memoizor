# Memoizor

> A feature rich and easy to use memoization/caching library.



## Features

​


## Basic Usage

### Syncronous Functions

> **Memoizor.sync**(target[, options])

Directly call the default export *memoizor* on the function you want to memoize, or use *memoizor.sync*.

```js
import memoizor from 'memoizor';

const fn = memoizor(myFunction);
const fn = memoizor.sync(myFunction); // Alternatively...

fn('hello', 'world'); // 1st call, function is executed.
fn('hello', 'world'); // 2nd call, same argument signature, cache hit.
```



### Promise Returning Functions

> **Memoizor.promise**(target[, options])

Call *memoizor.promise* with the *promise returning function* you want to memoize.

```js
const fn = memoizor.promise(myFunction);

fn(arg)                  // 1st call, function is executed.
  .then(res => fn(arg))  // 2nd call, same argument signature, cache hit.

fn(arg) // Probably *not* cached yet, since (for promises) caching is async.
  .then(res => {});
```



### Callback Functions

> **Memoizor.callback**(target[, options])

Call *memoizor.callback* with the promise you want to memoize.

```js
const fn = memoizor.callback(myFunction);

fn(arg, () => {       // 1st call, function is executed.
  fn(arg, () => {});  // 2nd call, same argument signature, cache hit
});

fn(arg, () => {}); // Probably *not* cached yet, since (for callbacks) caching is async.
```

#### Specifying the Callback Argument

You can specify the *index* of the callback argument using *options.callbackIndex*. If *options.callbackIndex* is either unspecified or a non-numeric value, the **last argument passed** is assumed.

```js
// Providing the callback as the first arugment is unconventional and discouraged,
// but this is a silly contrived example anyways. :P

function sum(done, ...nums) {
  process.nextTick(() => done(nums.reduce((prev, curr) => (prev + curr), 0)));
}

const sumMemoized = memoizor.callback(sum, { callbackIndex: 0 });

sumMemoized((results) => {    // 1st call, function is executed
  console.log(results);       // Prints 32
  sumMemoized((results) => {  // 2nd call, cache hit
    console.log(results);     // Prints 32
  }, 5, 7, 9, 11);
}, 5, 7, 9, 11);
```



## Options

**All options are optional and available for all three *function modes*: (sync, promise, and callback):**

### ttl

> options.ttl =  *{number}*

The amount of time (in ms) that cached values will persist in the store before being automatically removed.

```js
const memoized = memoizor(fn, { ttl: 1000 });

memoized(1); // Function executed
memoized(1); // Cache hit
memoized(1); // Another cache hit

setTimeout(() => memoized(1), 1000); // Cache expired, function executed again
```

### maxArgs

> options.maxArgs =  *{number}*

Sets the number of arguments considered when generating the unique store key. All arguments after ``options.maxArgs - 1`` will be skipped. *Note: this is the total number of arguments, and not an index!*

This value will be clamped to the range: ``0 < maxArgs <= NUMBER.MAX_VALUE ``.

```js
const memoized = memoizor(fn, { maxArgs: 2 });

memoized(1, 2, 3, 4);    // Function executed, arguments 3 and 4 ignored. Stored using memoized(1, 2).
memoized(1, 2, 3);       // Cache hit, as everything after 2 was ignored.
memoized(1, 2);        	 // Another cache hit
memoized(1, 2, 3, 4, 5); // Another cache hit

memoized(2, 1, 3, 4, 5); // Different argument signature, cache miss, function executed.
memoized(1);             // Different argument signature, cache miss, function executed.
```

### ignoreArgs

> options.ignoreArgs =  *{Array\<number>}*

Ignores the arguments with the given **indicies**. This option *must be an array of numeric values*.

```js
const memoized = memoizor(fn, { ignoreArgs: [0, 1] });

memoized(3, 4, 5);     // 1st call, function executed.
memoized(1, 2, 5);     // Cache hit, since arguments 0 and 1 are ignored.
memoized('a', 'b', 5); // Another cache hit.

memoized(3, 4, 6);     // Cache miss, 3rd argument was different
```

**Beware of using *ignoreArgs* in combination with *maxArgs*!**    
The following will *always* have the same argument signature:

```js
const memoized = memoizor(fn, { ignoreArgs: [0], maxArgs: 1 });

// Since everything after argument 0 is skipped and argument 0 is also ignored,
// any set of arguments provided will be a cache hit!

memoized(3, 4, 5);     // 1st call, function executed.
memoized(1, 2, 5);     // Cache hit
memoized('a', 'b', 5); // Cache hit

memoized(3, 4, 6);     // Cache hit
memoized();            // Cache hit
```

### coerceArgs

> options.coerceArgs =  *{function|Array\<function|null>}*

**Coerces arguments before passing them to the key generator and store**

If *coerceArgs* is a function, it will be called with each argument. If *coerceArgs* is an array, the function correspoding to the index of the argument will be called.

Each *coerceArgs* function is called with two arguments: *arg* and *index* where *arg* is the argument and *index* is the index of the argument, respectively.

**Note: this only applies to the memoization of the function, the original arguments are still passed to the oirginal function if no cached value was found.**

```js
const fn = memoizor(fn, {
  coerceArgs: [String, Boolean, arg => (arg * 2)]
});

memoized(1000, '', '15'); // Arguments list coerced to: ['1000', false, 30]

const fn = memoizor(fn, {
  // A falsy value will be skipped and no coercion will occur for that argument.
  coerceArgs: [null, null, arg => (arg * 2)]
});

memoized(1000, '', '15'); // Arguments list coerced to: [1000, '', 30]
```

### maxRecords

> options.maxRecords = *{number}*

**Limits the number of store records allowed.** Once the maximum number of values has been cached, the first 10% LRU *(least recently used)* store values will be purged. Rather than purging only a single item, 10% is removed so the logic to prune the store isn't called every time a new value is cached.

**Default value is:** ``5000``.

You can set *options.LRUPercentPadding* to a number in the range ``0 < LRUPercentPadding <= 100`` to alter the percentage of records deleted from the store when **maxRecords** is exceeded.

When the number of maxRecords is exceed the **[overflow](#overflow)** event is emitted.

### callbackIndex

> options.callbackIndex = *{number}*

For *memoizor.callback*, specifies which argument is the callback argument. If omitted, the **last argument** will be assumed.

**See: [Specifying the Callback Argument](#specifying-the-callback-argument)**

### keyGenerator

> options.keyGenerator =  *{function}*

**If provided, this function will be called to generate store keys rather than the default.**

By default, keys are generated by serializing the arguments list using [**JSONNormalize**](https://github.com/JasonPollman/JSONNormalize) and then md5'ed. This guarantees a unique key, and also allows for the following magic:

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);

// 1st call, function "fn" executed
memoized({ foo: 'hello', bar: 'world' });
                  
// 2nd call, cache hit.
// Wait? The objects are ordered differently, but it still works.
memoized({ bar: 'world', foo: 'hello' });
```

**However, you can change how these keys are generated by passing a function as *options.keyGenerator*.**
The *keyGenerator* function is called with a single argument *args*, which is an array containing a list of *adjusted* arguments (modified to account for *maxArgs* and *ignoreArgs*).

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn, {
  keyGenerator: args => JSON.stringify(args),
});

// 1st call, function "fn" executed
memoized({ foo: 'hello', bar: 'world' });
                  
// 2nd call, cache miss. Function "fn" executed
memoized({ bar: 'world', foo: 'hello' });
```

### uid

> options.uid =  *{string}*

**A unique identifier that's concatenated with the arguments signature to generate store keys.**

In most cases, this will never need to be changed, however, if using Memoizor with a distributed store, this *might* need to be altered to ensure the keys are unique between programs sharing the same store.

**By default the uid is...**

```js
uid = JSON.stringify({
  application: 'MEMOIZOR',
  main: require.main.filename.replace(BACKSLASHES_G, '/'),
  function: this.name,
});
```

Which guarantees that the store keys will be unique to the *current application* and all functions with the name *name*.

Since store cache is local to each function, no collisions are possible when using Memoizor within a single process. However, if running multiple processes while using Memoizor and a distributed store, collsions **are** possible if you memoize multiple functions with the same name (note that anonymous functions recieve the name "anonymous").

*If that's the case, you might want to set this accordingly.*

### storageController

> options.storageController =  *{StorageController}*

**Sets the storage controller to use to manage cache storage. **     
**See:  [StorageControllers](#storage-controllers).**

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn, {
  storageController = new memoizor.FileStorageController({ path: './memoizor-cache'}),
});
```



## API

**Each *Memoizor*'ed function contains the following functions:**



### key

Gets store the key for the provided arguments list.    
You should call this with the **resolved arguments** (i.e. *Memoizor#resolveArguments*).

> **Memoizor#key**(args)

#### Parameters

**args** *{Array\<any>}*    
The arguments signature to get the key for.

#### Returns

*{string|Promise}* For *memoizor.sync* based functions, a string containing the key for the given arguments list. For *memoizor.callback* and *memoizor.promise* based functions, a promise that resolves with the key.

```js
import memoizor from 'memoizor';

function fn(arg) { ... }
const memoized = memoizor(fn);

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj);

memoized.key(memoized.resolveArguments([obj])); // Returns the key for the arguments signature [obj]
```



### get

Queries the store the the cache associated with the given arguments list. You should call this with the **resolved arguments** (i.e. *Memoizor#resolveArguments*).

> **Memoizor#get**(args)

#### Parameters

**args** *{Array\<any>}*    
The arguments signature to lookup the cached value of.

#### Returns

*{any|Promise}* For *memoizor.sync* based functions, the value associated with the given arguments signature. For *memoizor.callback* and *memoizor.promise* based functions, a promise that resolves with the value.

Note if ``value === memoizor.NOT_CACHED``, it incidates the value didn't exist in the store.

```js
import memoizor from 'memoizor';

function fn(obj) {
  return { ...obj, baz: 'cat' };
}

const memoized = memoizor(fn);

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj);

memoized.get(memoized.resolveArguments([obj])); // Returns { foo: 'hello', bar: 'world', baz: 'cat' }
```



### save

Adds a value to the store.

> **Memoizor#save**(value, args)

#### Parameters

**value** *{any}*    
The value to store.

**args** *{Array\<any>}*    
The arguments signature to associate with this value.

#### Returns

*{any|Promise}* For *memoizor.sync* based functions, the passed in as *value*. For *memoizor.callback* and *memoizor.promise* based functions, a promise that resolves with the originally passed value.

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);

// Pre-caching the arguments signature [obj]
memoized.save(memoized.resolveArguments([obj]));

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj); // Cache hit
```



### delete

Deletes a value from the store.

> **Memoizor#delete**(args)

#### Parameters

**args** *{Array\<any>}*    
The arguments signature to deleted the associate store value of.

#### Returns

*{any|Promise}* For *memoizor.sync* based functions, the deleted cache value. For *memoizor.callback* and *memoizor.promise* based functions, a promise that resolves with the deleted cache value.

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj);

// Delete cache with the arguments signature [obj]
memoized.delete(memoized.resolveArguments([obj]));

memoized(obj); // Cache miss, cache for [obj] was deleted.
```



### empty

Empties all values from the store. 

> **Memoizor#empty**()

#### Parameters

*none*

#### Returns

*{Memoizor}* The memoizor instance associated with the memoized function.

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj);

// Delete all cache
memoized.empty();

memoized(obj); // Cache miss, cache for [obj] was deleted.
```



### disable

Disables memoization until *Memoizor#enable* is called.

> **Memoizor#disable**([,empty])

#### Parameters

**empty** *{boolean=}*    
If truthy, the store will be emptied before disabling.

#### Returns

*{Memoizor}* The memoizor instance associated with the memoized function.

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);

const obj = { foo: 'hello', bar: 'world' };          
memoized(obj);
memoized(obj); // Cache hit.

// Disable memoization
memoized.disable();
                  
memoized(obj); // No caching, memoization disabled
```



### enable

Re-enables memoization.

> **Memoizor#enable**()

#### Parameters

*none*

#### Returns

*{Memoizor}* The memoizor instance associated with the memoized function.

```js
import memoizor from 'memoizor';

function fn(obj) { ... }
const memoized = memoizor(fn);
const obj = { foo: 'hello', bar: 'world' };

memoized(obj);
memoized(obj); // Cache hit.

memoized.disable();
memoized(obj); // No caching, memoization disabled

memoized.enable();
memoized(obj); // Cache hit.
```



### resolveArguments

Adjusts the given arugment array based on the current options set.

> **Memoizor#resolveArguments**(args)

#### Parameters

**args** *{Array\<any>}*    
The arguments signature to resolve.

#### Returns

*{Array\<any>}* The adjusted arguments list based on the settings: *maxArgs, ignoreArgs* and *coerceArgs*..

```js
import memoizor from 'memoizor';

function fn(...args) { return args.reduce((prev, curr) => (prev * curr), 1); }
const memoized = memoizor(fn, { maxArgs: 3, ignoreArgs: [0], coerceArgs: [null, null, Boolean] });

memoized.resolveArguments([1, 2, 3, 4, 5]) // => [2, true]
```



### storeContents

Retrieves a **copy** of the store contents.

> **Memoizor#storeContents**()

#### Parameters

*none*

#### Returns

*{any}* The store contents, which will vary depending on which [**StorageController**](#storage-controllers) is being used.

```js
import memoizor from 'memoizor';

function fn(...args) { return args.reduce((prev, curr) => (prev * curr), 1); }
const memoized = memoizor(fn);

memoized(1, 2, 3);
memoized(1, 2, 3, 4);

const cached = memoized.storeContents();

// Cached might be something like:
{
  '40afe18f83ad7849c7f9444adc4e9eba': 6,
  '3e6ea02f0c78f53e5cd659c18f9cd69d': 24,
}
```



### setStorageController

Sets the storage controller to use. **See:  [StorageControllers](#storage-controllers).**

> **Memoizor#setStorageController**(controller)

#### Parameters

**controller** *{StorageController}*    
The storage controller to use to manage caching.

#### Returns

*{Memoizor}* The memoizor instance associated with the memoized function.

```js
import memoizor from 'memoizor';

function fn(...args) { return args.reduce((prev, curr) => (prev * curr), 1); }
const memoized = memoizor(fn);

memoized(1, 2, 3);
memoized(1, 2, 3); // Cache hit

// Set the storage controller to use the FS storage controller
memoized.setStorageController(new memoizor.FileStorageControllerSync({ path: './memoizor-cache'}));

memoized(1, 2, 3); // Cache miss, using new storage controller.
memoized(1, 2, 3); // Cache hit (withing FileStorageControllerSync)
```



## Events

**Each *Memorizor'*ed function emits the following events...**



### retrieve

> Memoizor#on('retrieve', (key, args) => { … });

Emitted when a store value is being looked up (prior to retrieving the value from the store).

#### Arguments

**key** *{string}*    
The key generated by the arguments signature used by the store to index cached values.

**args** *{Array\<any>}*    
The *adjusted* arguments list used to generate the key.



### retrieved

> Memoizor#on('retrieved', (key, value, args) => { … });

Emitted after a store value has been retrieved from the store.

#### Arguments

**key** *{string}*    
The key generated by the arguments signature used by the store to index cached values.

**value** *{any}*    
The stored cache value.
If ``value === Memoizor.NOT_CACHED`` it means the store didn't contain cache for the given key.

**args** *{Array\<any>}*    
The *adjusted* arguments list used to generate the key.



### save

> Memoizor#on('save', (key, value, args) => { … });

Emitted when a store value is being saved (prior to save the value to the store).

#### Arguments

**key** *{string}*    
The key generated by the arguments signature used by the store to index cached values.

**value** *{any}*    
The value to cache.

**args** *{Array\<any>}*    
The *adjusted* arguments list used to generate the key.



### overflow

> Memoizor#on('overflow', (keys) => { … });

Emitted when [**maxRecords**](#maxrecords) has been exceeded.

#### Arguments

**keys** *{string}*    
The keys associated with the store values that will be deleted.



### delete

> Memoizor#on('delete', (key, args) => { … });

Emitted when a store value is going to be deleted.

#### Arguments

**key** *{string}*    
The key generated by the arguments signature used by the store to index cached values.

**args** *{Array\<any>}*    
The *adjusted* arguments list used to generate the key.



### deleted

> Memoizor#on('deleted', (key, value, args) => { … });

Emitted when a store value has been deleted.

#### Arguments

**key** *{string}*    
The key generated by the arguments signature used by the store to index cached values.

**value** *{any}*    
The stored cache value that has been deleted.

**args** *{Array\<any>}*    
The *adjusted* arguments list used to generate the key.



### empty

> Memoizor#on('empty', (key, value, args) => { … });

Emitted when a store is about to be "emptied".

#### Arguments

*none*



### enable

> Memoizor#on('enable');

Emitted when a memoized function has been "re-enabled" *(fn.enable())* was called.

#### Arguments

*none*



### disable

> Memoizor#on('disable');

Emitted when a memoized function has been "disabled" *(fn.disable())* was called.

#### Arguments

*none*



## Storage Controllers

*Storage Controllers* are classes that define the CRUD for Memoizor. Each controller implements a *save, retrieve, delete, empty* and *contents* method.

Each storage controller must extend **memoizor.StorageController** and implement every method listed above. The default storage controller is **memoizor.LocalStorageController** and stores data using a plain JS object.

Storage Controllers allow you to do things like use the file system to persist cache between processes (**FileSystemController** and **FileSystemControllerSync**) or use an API to POST to a database somewhere.

Note that some controllers **might not work** with certain function types. For example, the **FileSystemController** should not be used with syncronous functions, as it makes asyncronous file system function calls. The default controller works for all three function types (sync, callback, and promise).

#### Memoizor comes with the following built in controllers:

- **StorageController**

  The "base" controller, which cannot be used (abstract).

- **LocalStorageController**

  The default controller, which stores data in memory, using a plain JS object

- **FileSystemController**

  An async file system controller that persists memoizor cache between program life cycles and stores cache both in memory and on disk. Cache is loaded from a file when the controller instance is created.

- **FileSystemControllerSync**

  A synchronous version of the FileSystemController.



### Building Your Own Controllers

Simply subclass *memoizor.StorageController* and implement the methods shown in the template below. If you're building a controller for a **syncronous** function, the methods below must be synchronous, otherwise you're free to use async functions or return promises.

**Note: You must return the symbol memoizor.NOT_CACHED if retrieve() yields no cache. Returning undefined will assume a call to the function with the given arguments signature returned undefined.**

```js
import { StorageController } from 'memoizor';

class MyStorageController extends StorageController {
  constructor() {
    super();
  }
  
  /**
   * MyStorageController save implementation.
   * @param {string} key The unique key generated from the arguments signature.
   * @param {any} value The value produced by the memoized function.
   * @param {Array<any>} args The adjusted (resolved) arguments used to create key.
   * @param {Memoizor} memoizor The Memoizor instance associated with a memoized function.
   * @returns {any} The original value to save.
   * @override
   */
  save(key, value, args, memoizor) {
    // Store value with key
    return value;
  }
  
  /**
   * MyStorageController retrieve implementation.
   * @param {string} key The unique key generated from the arguments signature.
   * @param {Array<any>} args The adjusted (resolved) arguments used to create key.
   * @param {Memoizor} memoizor The Memoizor instance associated with a memoized function.
   * @returns {any} The stored value or memoizor.NOT_CACHED if the cache didn't exist.
   * @override
   */
  retrieve(key, args, memoizor) {
    if (isNotCached) return memoizor.NOT_CACHED;
    // Return cached value
  }
  
  /**
   * MyStorageController delete implementation.
   * @param {string} key The unique key generated from the arguments signature.
   * @param {Array<any>} args The adjusted (resolved) arguments used to create key.
   * @param {Memoizor} memoizor The Memoizor instance associated with a memoized function.
   * @returns {any} The stored value or memoizor.NOT_CACHED if the cache didn't exist.
   * @override
   */
  delete(key, args, memoizor) {
    if (isNotCached) return;
    // Delete cached value
  }
  
  /**
   * MyStorageController empty implementation.
   * @param {Memoizor} memoizor The Memoizor instance associated with a memoized function.
   * @returns {undefined}
   * @override
   */
  empty(memoizor) {
    // Dump cache
  }
  
  /**
   * MyStorageController contents implementation.
   * @returns {any} A copy of the store contents.
   * @override
   */
  contents() {
    // Return a copy of the cached values
  }
}
```

