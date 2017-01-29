import memoizor from './';

function fibonacci(num) {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}

function test(...args) {
  return 7;
}


(async () => {
  const memoized = memoizor.sync.all({ fibonacci, test }, { maxArgs: 1 });

  console.log(memoized);

  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  console.log(memoized.fibonacci(40, 2, 3, 4));
  console.log(memoized.fibonacci(40));

  memoized.test.delete(memoized.test.key(1, 2, 3, 4));

  console.log(memoized.test(1, 2, 3, 7));
  console.log(memoized.test(1, 2, 3, 8));
  console.log(memoized.test(1, 2, 3, 9));

  memoized.test.disable();
  console.log(memoized.test(1, 2, 3, 10));
  console.log(memoized.test(1, 2, 3, 11));
  console.log(memoized.test(1, 2, 3, 12));
  console.log(memoized.test(1, 2, 3, 13));
  console.log(memoized.test(1, 2, 3, 14));

  memoized.test.enable();
  console.log(memoized.test(1, 2, 3, 10));
  console.log(memoized.test(1, 2, 3, 11));
  console.log(memoized.test(1, 2, 3, 12));
  console.log(memoized.test(1, 2, 3, 13));
  console.log(memoized.test(1, 2, 3, 14));

  memoized.test.delete([1, 2, 3, 10]);
  // memoized.test.delete('6212967c508ad7143ce74d0d5926d3bf');
})().catch(e => console.error(e.stack));
