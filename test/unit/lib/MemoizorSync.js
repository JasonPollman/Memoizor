import MemoizorSync from '../../../src/lib/MemoizorSync';

describe('MemoizorSync Class', () => {
  describe('MemoizorSync#constructor', () => {
    it('Should memoize a function with the default settings', () => {
      const memoizor = new MemoizorSync(() => 7);
      const memoized = memoizor.callable;

      expect(memoizor.memoized).to.be.a('function');
      expect(memoizor.memoized.memoizor).to.equal(memoizor);
      expect(memoized).to.equal(memoizor.memoized);
    });

    it('Should return the correct function call results', () => {
      const memoizor = new MemoizorSync(x => x * 2);
      const memoized = memoizor.callable;
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);
    });
  });

  describe('MemoizorSync#key', () => {
    let memoizor;

    it('Should return an md5 key hash by default', () => {
      memoizor = new MemoizorSync(x => x * 2);
      expect(memoizor.key([1, 2, 3])).to.equal('3ba716572eead25867d675b77fd911f0');
    });

    it('Should be overridden by options.keyGenerator', () => {
      memoizor = new MemoizorSync(x => x * 2, {
        keyGenerator: (uid, args) => {
          expect(uid).to.be.a('string');
          expect(args).to.be.eql([1, 2, 3]);
          return 'key';
        },
      });
      expect(memoizor.key([1, 2, 3])).to.equal('key');
    });
  });

  describe('MemoizorSync#memoized', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should emit the "save" event when called', (done) => {
      let emitted = 0;

      memoizor.on('save', (key, value, args) => {
        expect(key).to.be.oneOf(['4eb5aaba3b7a885eb9115e9bee326aa4', '2b9b5b4dceb4e1ff960afe469fa56f18', '632773fc94f12205d3b270c3381619c5']);
        expect(value).to.be.oneOf([0, 14, 18]);
        expect(args).to.be.an('array');
        if (++emitted === 3) done();
      });

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);
    });

    it('Should emit the "retrieve" event when called', (done) => {
      let emitted = 0;

      memoizor.on('retrieve', (key, args) => {
        expect(key).to.be.oneOf(['4eb5aaba3b7a885eb9115e9bee326aa4', '2b9b5b4dceb4e1ff960afe469fa56f18', '632773fc94f12205d3b270c3381619c5']);
        expect(args).to.be.an('array');
        if (++emitted === 3) done();
      });

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);
    });
  });
});
