import _ from 'lodash';
import * as memoizor from '../../../src/lib/exports-wrapper';
import Memoizor from '../../../src/lib/Memoizor';

describe('Memoize Exports Wrapper', () => {
  describe('callback', () => {
    it('Should throw if the target isn\'t a function', () => {
      assert.throws(() => memoizor.callback('foo'), 'Cannot memoize non-function!');
    });

    it('Should *not* memoize already memoized functions', () => {
      const fn = memoizor.callback((val, cb) => cb(null, val * 10));
      expect(fn).to.be.a('function');
      expect(fn.memoizor).to.be.an('object');

      expect(memoizor.promise(fn)).to.equal(fn);
      expect(memoizor.callback(fn)).to.equal(fn);
      expect(memoizor.sync(fn)).to.equal(fn);
    });

    it('Should memoize callback functions', (done) => {
      const fn = memoizor.callback((val, cb) => cb(null, val * 10));
      expect(fn).to.be.a('function');

      fn(1, (err, res) => {
        if (err) return done(err);
        expect(err).to.equal(null);
        expect(res).to.equal(10);
        return done();
      });
    });
  });

  describe('promise', () => {
    it('Should throw if the target isn\'t a function', () => {
      assert.throws(() => memoizor.promise('foo'), 'Cannot memoize non-function!');
    });

    it('Should *not* memoize already memoized functions', () => {
      const fn = memoizor.promise(val => new Promise(resolve => resolve(val * 10)));
      expect(fn).to.be.a('function');
      expect(fn.memoizor).to.be.an('object');

      expect(memoizor.promise(fn)).to.equal(fn);
      expect(memoizor.callback(fn)).to.equal(fn);
      expect(memoizor.sync(fn)).to.equal(fn);
    });

    it('Should memoize promise functions', async () => {
      const fn = memoizor.promise(val => new Promise(resolve => resolve(val * 10)));
      expect(fn).to.be.a('function');

      const res = await fn(1);
      expect(res).to.equal(10);
    });
  });

  describe('sync', () => {
    it('Should throw if the target isn\'t a function', () => {
      assert.throws(() => memoizor.sync('foo'), 'Cannot memoize non-function!');
    });

    it('Should *not* memoize already memoized functions', () => {
      const fn = memoizor.sync(val => (val * 10));
      expect(fn).to.be.a('function');
      expect(fn.memoizor).to.be.an('object');

      expect(memoizor.promise(fn)).to.equal(fn);
      expect(memoizor.callback(fn)).to.equal(fn);
      expect(memoizor.sync(fn)).to.equal(fn);
    });

    it('Should memoize promise functions', () => {
      const fn = memoizor.sync(val => (val * 10));
      expect(fn).to.be.a('function');

      const res = fn(1);
      expect(res).to.equal(10);
    });
  });

  describe('Memoizing class methods', () => {
    it('Should memoize class methods', () => {
      class Foo {
        bar(x) {
          return x;
        }
      }

      memoizor.memoizeMethod(Foo.prototype, 'bar');
      const x = new Foo();

      expect(x.bar).to.be.a('function');
      x.bar(2);

      expect(x.bar.memoizor).to.be.an.instanceof(Memoizor);
    });

    it('Should throw if the class doesn\'t contain a member with the given property', () => {
      class Foo {
        bar(x) {
          return x;
        }
      }

      assert.throws(
        () => memoizor.memoizeMethod(Foo.prototype, 'blah'),
        'Memoizor: Constructor contains no property  "blah"');
    });

    it('Should throw if the class property specified isn\'t a function', () => {
      class Foo {
        bar(x) {
          return x;
        }
      }

      Foo.prototype.baz = 10;

      assert.throws(
        () => memoizor.memoizeMethod(Foo.prototype, 'baz'),
        'Memoizor: Expected a function for constructor property "baz"');
    });
  });

  describe('Memoizor decorators', () => {
    describe('sync', () => {
      it('Should decorate class methods', () => {
        class Foo {
          @memoizor.memoize({});
          bar(...args) {
            return args;
          }

          @memoizor.memoize
          baz() {
            return 7;
          }
        }

        const x = new Foo();
        const y = new Foo();
        const z = new Foo();

        expect(x.bar(1)).to.eql([1]);
        expect(x.bar(2)).to.eql([2]);
        expect(x.bar(3)).to.eql([3]);
        expect(y.bar(2)).to.eql([2]);
        expect(y.bar(2)).to.eql([2]);
        expect(z.bar()).to.eql([]);

        expect(Object.keys(x.bar.storeContents()).length).to.equal(3);
        expect(Object.keys(y.bar.storeContents()).length).to.equal(1);
        expect(Object.keys(z.bar.storeContents()).length).to.equal(1);

        expect(x.baz()).to.equal(7);
        expect(x.baz.memoizor).to.be.an.instanceof(Memoizor);
      });
    });

    describe('promise', () => {
      it('Should decorate class methods', async () => {
        class Foo {
          @memoizor.memoize.promise({});
          async bar(...args) {
            return args;
          }

          @memoizor.memoize.promise
          async baz() {
            return 7;
          }
        }

        const x = new Foo();
        const y = new Foo();
        const z = new Foo();

        expect(await x.bar(1)).to.eql([1]);
        expect(await x.bar(2)).to.eql([2]);
        expect(await x.bar(3)).to.eql([3]);
        expect(await y.bar(2)).to.eql([2]);
        expect(await y.bar(2)).to.eql([2]);
        expect(await z.bar()).to.eql([]);

        expect(Object.keys(x.bar.storeContents()).length).to.equal(3);
        expect(Object.keys(y.bar.storeContents()).length).to.equal(1);
        expect(Object.keys(z.bar.storeContents()).length).to.equal(1);

        expect(await x.baz()).to.equal(7);
        expect(x.baz.memoizor).to.be.an.instanceof(Memoizor);
      });
    });

    describe('callback', () => {
      it('Should decorate class methods', () => {
        class Foo {
          @memoizor.memoize.callback
          baz(done) {
            done(null, 7);
          }
        }

        const x = new Foo();
        x.baz((e, res) => {
          expect(e).to.equal(null);
          expect(res).to.equal(7);
        });

        expect(x.baz.memoizor).to.be.an.instanceof(Memoizor);
      });
    });
  });

  ['sync', 'callback', 'promise'].forEach((mode) => {
    describe(`sync.${mode}`, () => {
      it('Should throw if the input provided isn\'t an object or array', () => {
        assert.throws(
          () => memoizor[mode].all('string'),
          'Expected a non-null object or array, but got: string');

        assert.throws(
          () => memoizor[mode].all(null),
          'Expected a non-null object or array, but got: null');
      });

      it('Should memoize all functions contained in an object', () => {
        const data = {
          foo: () => {},
          bar: function bar() {},
          baz: 'string',
        };

        const memoizedObject = memoizor[mode].all(data);
        _.each(memoizedObject, (val, key) => {
          if (key === 'baz') return expect(val).to.equal('string');
          expect(val).to.be.a('function');
          return expect(val.memoizor).to.be.an.instanceof(Memoizor);
        });
      });

      it('Should memoize all functions contained in an array', () => {
        const data = [
          () => {},
          function bar() {},
          'string',
        ];

        const memoizedObject = memoizor[mode].all(data);
        _.each(memoizedObject, (val, key) => {
          if (key === 2) return expect(val).to.equal('string');
          expect(val).to.be.a('function');
          return expect(val.memoizor).to.be.an.instanceof(Memoizor);
        });
      });
    });
  });
});
