import memoizor from '../';
import memoizee from 'memoizee';

/**
 * Converts a process.hrtime tuple to nanoseconds.
 * @param {Array<number>} hrtime A process.hrtime tuple.
 * @returns {number} The hrtime value in nanoseconds.
 */
function toMilliseconds(hrtime) {
  return ((hrtime[0] * 1e9) + hrtime[1]) * 1e-6;
}

function printResults(msg, end) {
  console.log(`${msg}: ${end.toLocaleString()}ms`);
}

const N = 3000;
const ROUNDS = 1;

let start;
let end;

start = process.hrtime();
const fibMemoized = memoizor(n => (n <= 1 ? 1 : fibMemoized(n - 1) + fibMemoized(n - 2)));
printResults('Time to memoized fibonacci function', toMilliseconds(process.hrtime(start)));

const fibMemoized2 = memoizee(n => (n <= 1 ? 1 : fibMemoized2(n - 1) + fibMemoized2(n - 2)), { primitive: true });
const fibMemoized3 = memoizee(n => (n <= 1 ? 1 : fibMemoized3(n - 1) + fibMemoized3(n - 2)));

const A1 = [1, 2, 3, 4];
const A2 = { foo: { bar: { baz: [1, 2, 3, 4] } } };

start = process.hrtime();
for (let i = 0; i < ROUNDS; i++) fibMemoized2(N, A1, A2);
end = process.hrtime(start);
printResults('Total time (Memoizee, Primitive Mode)', toMilliseconds(end));

start = process.hrtime();
for (let i = 0; i < ROUNDS; i++) fibMemoized3(N, A1, A2);
end = process.hrtime(start);
printResults('Total time (Memoizee)', toMilliseconds(end));

start = process.hrtime();
for (let i = 0; i < ROUNDS; i++) fibMemoized(N, A1, A2);
end = process.hrtime(start);
printResults('Total time (Memoizor)', toMilliseconds(end));
