import * as memoizor from '../../../src/lib/exports-wrapper';

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
});
