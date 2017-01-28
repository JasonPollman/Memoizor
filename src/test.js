import memoizor from './';

function fibonacci(num) {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}

function test(...args) {
  return args;
}



(async () => {
  const memoized = memoizor.sync.all({ fibonacci, test }, { maxArgs: 1 });

  console.log(memoized.test);

  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  console.log(memoized.fibonacci(40, 2, 3, 4));
  console.log(memoized.fibonacci(40));

  memoized.test.delete(memoized.test.key(1, 2, 3, 4));

  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  memoized.test.unmemoize();
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  memoized.test.memoize();
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

})().catch(e => console.error(e.stack));
