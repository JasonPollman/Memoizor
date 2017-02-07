import MemoizorCallback from '../../../src/lib/MemoizorCallback';
import ErrorStorageController from '../../data/ErrorStorageController';

describe('MemoizorCallback Class', () => {
  describe('MemoizorCallback#constructor', () => {
    it('Should memoize a function with the default settings', () => {
      const memoizor = new MemoizorCallback(done => done(7));
      const memoized = memoizor.callable;

      expect(memoizor.memoized).to.be.a('function');
      expect(memoizor.memoized.memoizor).to.equal(memoizor);
      expect(memoized).to.equal(memoizor.memoized);
    });

    it('Should memoize a function with the default settings (non-options options argument)', () => {
      const memoizor = new MemoizorCallback(done => done(7), 'string');
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

    it('Should set the callback index', (done) => {
      const memoizor = new MemoizorCallback((x, y, cb, z, p, q) => cb(x * y * z * p * q, 'foobar'), {
        callbackIndex: 2,
      });

      const memoized = memoizor.callable;

      memoized(1, 1, (mul, string) => {
        if (mul instanceof Error) done(mul);

        try {
          expect(mul).to.equal(8);
          expect(string).to.equal('foobar');
        } catch (e) {
          return done(e);
        }

        return done();
      }, 2, 2, 2);
    });

    it('Should set the callback index to undefined in indeterminate', (done) => {
      const memoizor = new MemoizorCallback((x, y, cb, z, p, q) => cb(x * y * z * p * q, 'foobar'), {
        callbackIndex: Number.POSITIVE_INFINITY,
      });

      const memoized = memoizor.callable;
      memoized(1, 1, () => {}, 2, 2, 2, () => done(new Error('Expected no to be here...')));
      setTimeout(done, 1000);
    })
    .timeout(3000).slow(3000);

    it('Should hang if no callback passed to the function', (done) => {
      const memoizor = new MemoizorCallback(x => x, {});
      const memoized = memoizor.callable;
      memoized(1, 2, 3);
      setTimeout(done, 1000);
    })
    .timeout(3000).slow(3000);

    it('Should hang if no callback passed to the function (missing defined callback)', (done) => {
      const memoizor = new MemoizorCallback((x, cb) => cb(x), {});
      const memoized = memoizor.callable;
      memoized(1, 2, 3);
      setTimeout(done, 1000);
    })
    .timeout(3000).slow(3000);

    it('Should call the callback with an error if the function callback first argument is an error', (done) => {
      const memoizor = new MemoizorCallback((x, cb) => cb(new Error('foo')), {});
      const memoized = memoizor.callable;
      memoized(1, (e) => {
        expect(e).to.be.an('error');
        expect(e.message).to.equal('foo');
        done();
      });
    });

    it('Should pass onRetrieve errors to done', (done) => {
      const memoizor = new MemoizorCallback((x, cb) => cb(null, x), {
        storageController: new ErrorStorageController(),
      });

      const memoized = memoizor.callable;
      memoized(1, (e) => {
        expect(e).to.be.an('error');
        expect(e.message).to.equal('oops retrieve');
        done();
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

    it('Should delete cached items (resolved true)', (done) => {
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
        }, true);
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

    it('Should add cached items', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4], (err, res) => {
        expect(err).to.equal(null);
        expect(res).to.equal('foobar');

        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        memoized(4, (e, val) => {
          expect(e).to.equal(null);
          expect(val).to.equal('foobar');
        });
        done();
      });
    });

    it('Should wrap saved items in an array since callbacks can return multiple values', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', 4, (err, res) => {
        expect(err).to.equal(null);
        expect(res).to.equal('foobar');

        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        memoized(4, (e, val) => {
          expect(e).to.equal(null);
          expect(val).to.equal('foobar');
        });
        done();
      });
    });

    it('Should add cached items (using arguments object)', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      (function foo() {
        memoized.save('foobar', arguments, (err, res) => { // eslint-disable-line prefer-rest-params
          expect(err).to.equal(null);
          expect(res).to.equal('foobar');

          expect(Object.keys(memoized.storeContents()).length).to.equal(1);
          memoized(4, (e, val) => {
            expect(e).to.equal(null);
            expect(val).to.equal('foobar');
            done();
          });
        });
      }(4));
    });
  });

  describe('MemoizorCallback#get', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback((x, cb) => cb(null, x * 2));
      memoized = memoizor.memoized;
    });

    it('Should retrieve cached items', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4], (err, res) => {
        expect(err).to.equal(null);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        expect(res).to.eql('foobar');

        memoized(4, (e, val) => {
          expect(e).to.equal(null);
          expect(val).to.equal('foobar');

          memoized(1, (e1, val1) => {
            expect(e1).to.equal(null);
            expect(val1).to.equal(2);

            memoized(1, (e2, val2) => {
              expect(e2).to.equal(null);
              expect(val2).to.equal(2);
              expect(Object.keys(memoized.storeContents()).length).to.equal(2);

              memoized.get([1], (e3, val3) => {
                expect(e3).to.equal(null);
                expect(val3).to.equal(2);

                memoized.get([1], (e4, val4) => {
                  expect(e4).to.equal(null);
                  expect(val4).to.equal(2);

                  memoized.get([4], (e5, val5) => {
                    expect(e5).to.equal(null);
                    expect(val5).to.equal('foobar');
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('Should retrieve cached items (not cached)', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.get([4], (err, results) => {
        expect(err).to.equal(null);
        expect(results).to.equal(memoizor.NOT_CACHED);
        done();
      });
    });

    it('Should retrieve cached items (using arguments object)', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized.save('foobar', [4], () => {
        memoized(1, () => {
          memoized(1, () => {
            expect(Object.keys(memoized.storeContents()).length).to.equal(2);

            /* eslint-disable prefer-rest-params */
            (function foo() {
              memoized.get(arguments, (err, res) => {
                expect(err).to.equal(null);
                expect(res).to.equal(2);

                (function foo2() {
                  memoized.get(arguments, (err1, res1) => {
                    expect(err1).to.equal(null);
                    expect(res1).to.equal(2);

                    (function foo3() {
                      memoized.get(arguments, (err2, res2) => {
                        expect(err).to.equal(null);
                        expect(res2).to.equal('foobar');
                        done();
                      });
                    }(4));
                  });
                }(1));
              });
            }(1));
            /* eslint-enable prefer-rest-params */
          });
        });
      });
    });
  });

  describe('MemoizorCallback#empty', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback((x, cb) => cb(null, x * 2));
      memoized = memoizor.memoized;
    });

    it('Should clear the store', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized(4, (e, val) => {
        expect(e).to.equal(null);
        expect(val).to.equal(8);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);

        memoized.empty((err) => {
          expect(err).to.equal(null);
          expect(Object.keys(memoized.storeContents()).length).to.equal(0);
          done();
        });
      });
    });
  });

  describe('MemoizorCallback#unmemoize', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorCallback((x, cb) => cb(null, x * 2));
      memoized = memoizor.memoized;
    });

    it('Should clear the store, if the "clear" argument is truthy', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized(4, (e, val) => {
        expect(e).to.equal(null);
        expect(val).to.equal(8);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);

        memoized.unmemoize(true, (err) => {
          expect(err).to.equal(null);
          expect(Object.keys(memoized.storeContents()).length).to.equal(0);
          done();
        });
      });
    });

    it('Should *not* clear the store, if the "clear" argument is falsy (callback only)', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized(4, (e, val) => {
        expect(e).to.equal(null);
        expect(val).to.equal(8);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        memoized.unmemoize((err) => {
          expect(err).to.equal(null);
          expect(Object.keys(memoized.storeContents()).length).to.equal(1);
          done();
        });
      });
    });

    it('Should *not* clear the store, if the "clear" argument is falsy (falsy, then callback argument)', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized(4, (e, val) => {
        expect(e).to.equal(null);
        expect(val).to.equal(8);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        memoized.unmemoize(false, (err) => {
          expect(err).to.equal(null);
          expect(Object.keys(memoized.storeContents()).length).to.equal(1);
          done();
        });
      });
    });

    it('Should also return a promise', (done) => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      memoized(4, async (e, val) => {
        expect(e).to.equal(null);
        expect(val).to.equal(8);
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        await memoized.unmemoize();
        expect(Object.keys(memoized.storeContents()).length).to.equal(1);
        done();
      });
    });
  });
});
