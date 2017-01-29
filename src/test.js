import memoizor from './';

function fibonacci(num) {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}

function test(...args) {
  return 7;
}


(async () => {
  const controller = new memoizor.FileStorageControllerSync('./test.txt');
  await controller.init();

  const memoized = memoizor.sync(test, {
    ignoreArgs: [0, 1, 2, 3, 4, 5],
  });

  const memoized2 = memoizor.sync(memoized, {
    ignoreArgs: [0, 1, 2, 3, 4, 5],
  });

  console.log(memoized, test);

  console.log(memoized(1, 2, 3, 4));
  console.log(memoized2(1, 2, 3, 5));

  console.log(memoized(1, 2, 3, 4));
  console.log(memoized2(1, 2, 3, 5));
  
})().catch(e => console.error(e.stack));
