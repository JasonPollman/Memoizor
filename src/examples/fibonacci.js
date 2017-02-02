/* eslint-disable no-console */

import memoizor from '../../dist';

let start;
let elapsed;
let fibonacci;

const N = 3000;

function calculate(total) {
  const results = [];
  let i = 0;

  start = Date.now();
  while (i++ < total) fibonacci(i);
  elapsed = Date.now() - start;

  return results;
}

fibonacci = memoizor(n => (n <= 1 ? 1 : fibonacci(n - 1) + fibonacci(n - 2)));
calculate(N);
console.log(`Total time (object): ${elapsed}ms`);
