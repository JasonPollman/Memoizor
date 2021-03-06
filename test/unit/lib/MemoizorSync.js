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

    it('Should return an md5 key hash by default (using arguments object)', () => {
      memoizor = new MemoizorSync(x => x * 2);
      (function foobar() {
        /* eslint-disable prefer-rest-params */
        expect(memoizor.key(arguments)).to.equal('3ba716572eead25867d675b77fd911f0');
        /* eslint-enable prefer-rest-params */
      }(1, 2, 3));
    });

    it('Should return a basic string if options.mode === "primitive"', () => {
      memoizor = new MemoizorSync(x => x * 2, { mode: 'primitive' });
      expect(memoizor.key([1, 2, 3])).to.equal('1\u00002\u00003');
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

  describe('MemoizorSync#delete', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should delete cached items', () => {
      memoized(4);
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      memoized.delete([4]);
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
    });

    it('Should delete cached items (using arguments object)', () => {
      memoized(4);
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      (function foo() { memoized.delete(arguments); }(4)); // eslint-disable-line prefer-rest-params
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
    });
  });

  describe('MemoizorSync#save', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should add cached items', () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4]);
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      expect(memoized(4)).to.equal('foobar');
    });

    it('Should add cached items (using arguments object)', () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      (function foo() { memoized.save('foobar', arguments); }(4)); // eslint-disable-line prefer-rest-params
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      expect(memoized(4)).to.equal('foobar');
    });
  });

  describe('MemoizorSync#get', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should retrieve cached items', () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4]);
      memoized(1);
      memoized(1, 2);
      expect(Object.keys(memoized.storeContents()).length).to.equal(3);
      expect(memoized.get([1])).to.equal(2);
      expect(memoized.get([1, 2])).to.equal(2);
      expect(memoized.get([4])).to.equal('foobar');
    });

    it('Should retrieve cached items (using arguments object)', () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4]);
      memoized(1);
      memoized(1, 2);
      expect(Object.keys(memoized.storeContents()).length).to.equal(3);

      /* eslint-disable prefer-rest-params */
      expect(function foo() { return memoized.get(arguments); }(1)).to.equal(2);
      expect(function foo() { return memoized.get(arguments); }(1, 2)).to.equal(2);
      expect(function foo() { return memoized.get(arguments); }(4)).to.equal('foobar');
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

    it('Should delete cache items after their ttl expires', (done) => {
      const memoizor2 = new MemoizorSync(x => x * 2, { ttl: 500 });
      memoizor2.memoized(2);
      memoizor2.memoized(2);
      memoizor2.memoized(2);
      memoizor2.memoized(2);

      memoizor2.on('deleted', (key, result, args) => {
        try {
          expect(key).to.be.a('string');
          expect(result).to.equal(4);
          expect(args).to.eql([2]);
          expect(memoizor2.storeContents()).to.eql({});
        } catch (e) {
          return done(e);
        }

        return done();
      });

      expect(Object.keys(memoizor2.storeContents()).length).to.equal(1);
      setTimeout(() => memoizor2.memoized(2), 500);
    })
    .timeout(2000).slow(1500);
  });
});
