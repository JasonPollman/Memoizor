import MemoizorCallback from '../../../src/lib/MemoizorCallback';

describe('MemoizorCallback Class', () => {
  describe('MemoizorCallback#constructor', () => {
    it('Should memoize a function with the default settings', () => {
      const memoizor = new MemoizorCallback(done => done(7));
      const memoized = memoizor.callable;

      expect(memoizor.memoized).to.be.a('function');
      expect(memoizor.memoized.memoizor).to.equal(memoizor);
      expect(memoized).to.equal(memoizor.memoized);
    });

    it('Should return the correct function call results', (done) => {
      const memoizor = new MemoizorCallback((x, cb) => cb(x * 2));
      const memoized = memoizor.callable;
      let finished = 0;

      memoized(0, (res) => {
        if (res instanceof Error) done(res);
        try { expect(res).to.equal(0); } catch (e) { return done(e); }
        if (++finished === 3) done();
        return null;
      });
      memoized(7, (res) => {
        if (res instanceof Error) done(res);
        try { expect(res).to.equal(14); } catch (e) { return done(e); }
        if (++finished === 3) done();
        return null;
      });
      memoized(9, (res) => {
        if (res instanceof Error) done(res);
        try { expect(res).to.equal(18); } catch (e) { return done(e); }
        if (++finished === 3) done();
        return null;
      });
    });
  });

  describe('MemoizorCallback#key', () => {
    let memoizor;

    it('Should return an md5 key hash by default', (done) => {
      memoizor = new MemoizorCallback((x, cb) => cb(x * 2));
      memoizor.key([1, 2, 3], (err, key) => {
        try {
          expect(err).to.equal(null);
          expect(key).to.equal('3ba716572eead25867d675b77fd911f0');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('Should return an md5 key hash by default (using arguments object)', (done) => {
      memoizor = new MemoizorCallback((x, cb) => cb(x * 2));
      (function foobar() {
        const args = arguments; // eslint-disable-line prefer-rest-params
        memoizor.key(args, (err, key) => {
          try {
            expect(err).to.equal(null);
            expect(key).to.equal('3ba716572eead25867d675b77fd911f0');
            done();
          } catch (e) {
            done(e);
          }
        });
      }(1, 2, 3));
    });

    it('Should return a basic string if options.mode === "primitive"', (done) => {
      memoizor = new MemoizorCallback(x => x * 2, { mode: 'primitive' });
      memoizor.key([1, 2, 3], (err, key) => {
        expect(err).to.equal(null);
        expect(key).to.equal('1\u00002\u00003');
        done();
      });
    });

    it('Should be overridden by options.keyGenerator', (done) => {
      memoizor = new MemoizorCallback((x, cb) => cb(x * 2), {
        keyGenerator: (uid, args) => {
          expect(uid).to.be.a('string');
          expect(args).to.be.eql([1, 2, 3]);
          return 'key';
        },
      });

      memoizor.key([1, 2, 3], (err, key) => {
        expect(err).to.equal(null);
        expect(key).to.equal('key');
        done();
      });
    });
  });

  describe('MemoizorCallback#delete', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback((x, done) => done(null, x * 2));
      memoized = memoizor.memoized;
    });

    it('Should delete cached items', (done) => {
      memoized(4, (err, res) => {
        if (err) return done(err);
        try {
          expect(res).to.equal(8);
          expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        } catch (e) {
          return done(e);
        }

        return memoized.delete([4], (e, val) => {
          if (e) return done(err);
          try {
            expect(val).to.equal(8);
            expect(Object.keys(memoized.storeContents()).length).to.equal(1);
          } catch (error) {
            return done(error);
          }
          return done();
        });
      });
    });

    it('Should delete cached items (using arguments object)', (done) => {
      memoized(4, (err, res) => {
        if (err) return done(err);
        try {
          expect(res).to.equal(8);
          expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        } catch (e) {
          return done(e);
        }

        return (function foo() {
          memoized.delete(arguments, (e, value) => {  // eslint-disable-line prefer-rest-params
            if (e) return done(err);

            try {
              expect(value).to.equal(8);
              expect(Object.keys(memoized.storeContents()).length).to.equal(0);
            } catch (error) {
              return done(error);
            }
            return done();
          });
        }(4));
      });
    });
  });

  describe('MemoizorCallback#save', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback(x => x * 2);
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

  describe('MemoizorCallback#get', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback(x => x * 2);
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
});
