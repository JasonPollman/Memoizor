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
});
