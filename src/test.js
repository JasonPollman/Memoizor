import memoizor from './';

function fibonacci(num) {
  if (num <= 1) return 1;
  return fibonacci(num - 1) + fibonacci(num - 2);
}

function test(...args) {
  return args;
}


(async () => {
  const controller = new memoizor.FileStorageController('./test.txt');
  await controller.init();

  const memoized = memoizor.sync.all({ fibonacci, test }, {
    maxArgs: 1,
    storageController: controller,
  });

  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  console.log(memoized.fibonacci(40, 2, 3, 4));
  console.log(memoized.fibonacci(40));

  memoized.test.delete(memoized.test.key(1, 2, 3, 4));

  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  memoized.test.disable();
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

  memoized.test.enable();
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));
  console.log(memoized.test(1, 2, 3, 4));

})().catch(e => console.error(e.stack));
