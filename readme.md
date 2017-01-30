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

You can specify the *index* of the callback arugment using *options.callbackArgument*. If *options.callbackArgument* is either unspecified or a non-numeric value, the **last argument passed** is assumed.

```js
// Providing the callback as the first arugment is unconventional and discouraged,
// but this is a silly contrived example anyways. :P

function sum(done, ...nums) {
  process.nextTick(() => done(nums.reduce((prev, curr) => (prev + curr), 0)));
}

const sumMemoized = memoizor.callback(sum, { callbackIndex: 0 });

sumMemoized((results) => {    // 1st call, function is executed
  console.log(results);     // Prints 32
  sumMemoized((results) => {  // 2nd call, cache hit
    console.log(results);   // Prints 32
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
// Array coerceArgs example
const fn = memoizor(fn, {
  coerceArgs: [String, Boolean, arg => (arg * 2)]
});

// Arguments list coerced to: ['1000', false, 30]
memoized(1000, '', '15');

// Array coerceArgs example, skipping the first 2 arguments
// A falsy value will be skipped and no coercion will occur for that argument.
const fn = memoizor(fn, {
  coerceArgs: [null, null, arg => (arg * 2)]
});

// Arguments list coerced to: [1000, '', 30]
memoized(1000, '', '15');
```

### maxRecords

> options.maxRecords = *{number}*

**Limits the number of store records allowed.** Once the maximum number of values has been cached, the first 10% LRU *(least recently used)* store values will be purged. Rather than purging only a single item, 10% is removed so the logic to prune the store isn't called everytime a new value is cached.

**Default value is:** ``5000``.

You can set *options.LRUPercentPadding* to a number in the range ``0 < LRUPercentPadding <= 100`` to alter the percentage of records deleted from the store when **maxRecords** is exceeded.

When the number of maxRecords is exceed the **[overflow](#overflow)** event is emitted.

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