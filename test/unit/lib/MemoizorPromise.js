import MemoizorPromise from '../../../src/lib/MemoizorPromise';

describe('MemoizorPromise Class', () => {
  describe('MemoizorPromise#key', () => {
    let memoizor;

    it('Should return an md5 key hash by default', async () => {
      memoizor = new MemoizorPromise(x => x * 2);
      expect(await memoizor.key([1, 2, 3])).to.equal('3ba716572eead25867d675b77fd911f0');
    });

    it('Should be overridden by options.keyGenerator', async () => {
      memoizor = new MemoizorPromise(x => x * 2, {
        keyGenerator: (uid, args) => {
          expect(uid).to.be.a('string');
          expect(args).to.eql([1, 2, 3]);
          return 'key';
        },
      });
      expect(await memoizor.key([1, 2, 3])).to.equal('key');
    });

    it('Should return the arguments joined if in "primitive" mode', (done) => {
      memoizor = new MemoizorPromise(x => x * 2, {
        mode: 'primitive',
        keyGenerator: () => done(new Error('Expected this to never get hit')),
      });

      (async () => {
        expect(await memoizor.key([1, 2, 3])).to.equal('1\u00002\u00003');
        done();
      })();
    });
  });

  describe('Memoizor#setOptions', () => {
    it('Should set and validate options', async () => {
      const memoizor = new MemoizorPromise(() => {});
      expect(memoizor.getOption('ttl')).to.equal(undefined);
      expect(await memoizor.setOptions({ ttl: 1000 })).to.equal(memoizor.memoized);
      expect(memoizor.getOption('ttl')).to.equal(1000 * 1e6);
    });

    it('Should clear the store if the "clear" argument is true', async () => {
      const memoizor = new MemoizorPromise((a, b) => (a + b));
      await memoizor.memoized(1, 2);
      await memoizor.memoized(3, 4);

      expect(memoizor.storeContents()).to.eql({
        '30b823434ce87fd37b94ff3363d0ff9d': 3,
        b34820008f9ded2fc269268f8be1394b: 7,
      });

      expect(await memoizor.setOptions({ ttl: 3000 }, true)).to.equal(memoizor.memoized);
      expect(memoizor.storeContents()).to.eql({});
    });

    const newValues = [() => {}, () => {}, 'string'];
    ['keyGenerator', 'coerceArgs', 'uid'].forEach((option, idx) => {
      it(`Should clear the store if "${option}" option is changed`, async () => {
        const memoizor = new MemoizorPromise((a, b) => (a + b));
        await memoizor.memoized(1, 2);
        await memoizor.memoized(3, 4);

        expect(memoizor.storeContents()).to.eql({
          '30b823434ce87fd37b94ff3363d0ff9d': 3,
          b34820008f9ded2fc269268f8be1394b: 7,
        });

        const promise = memoizor.setOptions({ [option]: newValues[idx] });
        expect(promise.then).to.be.a('function');
        expect(await promise).to.equal(memoizor.memoized);
        expect(memoizor.storeContents()).to.eql({});
      });
    });
  });
});
