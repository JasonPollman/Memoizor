import Memoizor from '../../../src/lib/Memoizor';
import MemoizorSync from '../../../src/lib/MemoizorSync';
import LocalMapStorageController from '../../../src/lib/storage-controllers/LocalMapStorageController';

describe('Memoizor Class', () => {
  describe('Memoizor#constructor', () => {
    it('Should throw if the target isn\'t a function', () => {
      assert.throws(() => new Memoizor('string', {}, 'test'), 'Cannot memoize non-function!');
    });

    it('Should throw if type isn\'t a string', () => {
      [() => {}, null, {}, [], undefined].forEach((item) => {
        assert.throws(() => new Memoizor(() => {}, {}, item), 'Missing type');
      });
    });
  });

  describe('Memoizor#setStorageControler', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should throw if trying to set the storage controller to a non-StorageController instance', () => {
      [() => {}, null, {}, [], undefined].forEach((item) => {
        assert.throws(
          () => memoized.setStorageController(item),
          'Storage controllers must be an instance of StorageController');
      });
    });

    it('Should assign the new storage controller to the Memoizor instance', () => {
      const controller = new LocalMapStorageController();
      expect(memoized.memoizor.storage).to.not.equal(controller);
      memoized.setStorageController(controller);
      expect(memoized.memoizor.storage).to.equal(controller);
    });
  });

  describe('Memoizor#storeContents', () => {
    let memoizor;
    let memoized;

    before(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should return the store\'s contents', () => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });
    });
  });

  describe('Memoizor#clear', () => {
    let memoizor;
    let memoized;

    before(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should empty the store\'s contents', () => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      memoized.memoizor.clear();
      expect(memoized.storeContents()).to.eql({});
    });
  });

  describe('Memoizor#unmemoize', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should disable memoization', (done) => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      memoized.clear();
      memoized.unmemoize();
      memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
      memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);
      expect(memoized.storeContents()).to.eql({});
      done();
    });

    it('Should clear the store if the "clear" argument is true', (done) => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      memoized.unmemoize(true);
      memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
      memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);
      expect(memoized.storeContents()).to.eql({});
      done();
    });

    it('Should *not* the store if the "clear" argument is falsy', (done) => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      memoized.unmemoize();
      memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
      memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      done();
    });

    it('Should return if already disabled', (done) => {
      expect(memoized.isEnabled()).to.equal(true);
      memoized.unmemoize();
      expect(memoized.isEnabled()).to.equal(false);
      memoized.unmemoize();
      expect(memoized.isEnabled()).to.equal(false);
      memoized.unmemoize();
      expect(memoized.isEnabled()).to.equal(false);
      done();
    });
  });

  describe('Memoizor#memoize', () => {
    let memoizor;
    let memoized;

    before(() => {
      memoizor = new MemoizorSync(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should enable memoization', (done) => {
      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      memoized.unmemoize();
      memoized.memoize();

      let retrieved = false;
      memoized.memoizor.on('save', () => done(new Error('All calls should be cached!')));
      memoized.memoizor.on('retrieve', () => { retrieved++; });

      expect(memoized(0)).to.equal(0);
      expect(memoized(7)).to.equal(14);
      expect(memoized(9)).to.equal(18);

      expect(memoized.storeContents()).to.eql({
        '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
        '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
        '632773fc94f12205d3b270c3381619c5': 18,
      });

      expect(retrieved).to.equal(3);
      done();
    });

    it('Should return if already enabled', () => {
      expect(memoized.isEnabled()).to.equal(true);
      memoized.memoize();
      expect(memoized.isEnabled()).to.equal(true);
      memoized.memoize();
      expect(memoized.isEnabled()).to.equal(true);
      memoized.memoize();
      expect(memoized.isEnabled()).to.equal(true);
    });
  });

  describe('Options', () => {
    describe('bind', () => {
      it('Should bind the target function to the given value', () => {
        function fn() { return this; }

        let memoizor = new MemoizorSync(fn, { bind: 'foobar' });
        let memoized = memoizor.memoized;
        expect(memoized()).to.equal('foobar');

        const obj = {};
        memoizor = new MemoizorSync(fn, { bind: obj });
        memoized = memoizor.memoized;
        expect(memoized()).to.equal(obj);
      });
    });

    describe('ttl', () => {
      it('Should set ttl to undefined if non-numeric', () => {
        ['string', [], {}, () => {}, null].forEach((item) => {
          const memoizor = new MemoizorSync(() => this, { ttl: item });
          expect(memoizor.ttl).to.be.oneOf([null, undefined]);
        });
      });

      it('Should set ttl to a number if a numeric value was passed', () => {
        const expected = [60, 60, 60, 100, 8000, 60, 60, 1000];

        [0, 1, -1, 100, 8000, '60', '0', '1000'].forEach((item, idx) => {
          const memoizor = new MemoizorSync(() => this, { ttl: item });
          expect(memoizor.ttl).to.equal(expected[idx] * 1e6);
        });
      });
    });

    describe('maxRecords', () => {
      it('Should set maxRecords to undefined if non-numeric', () => {
        ['string', [], {}, () => {}, null].forEach((item) => {
          const memoizor = new MemoizorSync(() => this, { maxRecords: item });
          expect(memoizor.maxRecords).to.be.oneOf([null, undefined]);
        });
      });

      it('Should set maxRecords to a number if a numeric value was passed', () => {
        const expected = [0, 1, 0, 100, 8000, 60, 0, 1000];

        [0, 1, -1, 100, 8000, '60', '0', '1000'].forEach((item, idx) => {
          const memoizor = new MemoizorSync(() => this, { maxRecords: item });
          expect(memoizor.maxRecords).to.equal(expected[idx]);
        });
      });
    });

    describe('maxArgs', () => {
      it('Should set maxArgs to undefined if non-numeric', () => {
        ['string', [], {}, () => {}, null].forEach((item) => {
          const memoizor = new MemoizorSync(() => this, { maxArgs: item });
          expect(memoizor.maxArgs).to.be.oneOf([null, undefined]);
        });
      });

      it('Should set maxArgs to a number if a numeric value was passed', () => {
        const expected = [1, 1, 1, 100, 8000, 60, 1, 1000];

        [0, 1, -1, 100, 8000, '60', '0', '1000'].forEach((item, idx) => {
          const memoizor = new MemoizorSync(() => this, { maxArgs: item });
          expect(memoizor.maxArgs).to.equal(expected[idx]);
        });
      });
    });

    describe('LRUPercentPadding', () => {
      it('Should set LRUPercentPadding to undefined if non-numeric', () => {
        ['string', [], {}, () => {}, null].forEach((item) => {
          const memoizor = new MemoizorSync(() => this, { LRUPercentPadding: item });
          expect(memoizor.LRUPercentPadding).to.be.oneOf([null, undefined]);
        });
      });

      it('Should set LRUPercentPadding to a number if a numeric value was passed', () => {
        const expected = [1, 1, 1, 100, 8000, 60, 1, 1000];

        [0, 1, -1, 100, 8000, '60', '0', '1000'].forEach((item, idx) => {
          const memoizor = new MemoizorSync(() => this, { LRUPercentPadding: item });
          expect(memoizor.LRUPercentPadding).to.equal(expected[idx]);
        });
      });
    });

    describe('ignoreArgs', () => {
      it('Should throw if options.ignoreArgs is defined and isn\'t an array', () => {
        [1, () => {}, null, {}, class Foo {}].forEach((item) => {
          assert.throws(
            () => new MemoizorSync(() => {}, { ignoreArgs: item }),
            'Memoizor: options.ignoreArgs must be an array!');
        });
      });

      it('Should validate that all of the members of options.ignoreArgs are numeric', () => {
        const items = [1, () => {}, null, {}, class Foo {}, Number.MAX_VALUE];
        assert.throws(
            () => new MemoizorSync(() => {}, { ignoreArgs: items }),
            'Values of options.ignoreArgs must be finite numbers!');
      });

      it('Should convert all members fo options.ignoreArgs to numbers', () => {
        const items = ['1', 1, '0', '100'];
        const memoized = new MemoizorSync(() => {}, { ignoreArgs: items });
        expect(memoized.ignoreArgs).to.eql([1, 1, 0, 100]);
      });
    });

    describe('coerceArgs', () => {
      it('Should throw if options.coerceArgs is defined and isn\'t a function or array', () => {
        [1, null, {}, 'string'].forEach((item) => {
          assert.throws(
            () => new MemoizorSync(() => {}, { coerceArgs: item }),
            'The "coerceArgs" option must be a function or an array of types: [function, null, undefined]!');
        });
      });

      it('Should validate that all of the members of options.coerceArgs are functions', () => {
        const items = [1, () => {}, null, {}, class Foo {}, Number.MAX_VALUE];
        assert.throws(
            () => new MemoizorSync(() => {}, { coerceArgs: items }),
            'The "coerceArgs" option must be a function or an array of types: [function, null, undefined]!');
      });
    });

    describe('uid', () => {
      it('Should throw if options.uid is defined and isn\'t a string', () => {
        [1, () => {}, null, {}, []].forEach((item) => {
          assert.throws(
            () => new MemoizorSync(() => {}, { uid: item }),
            'Memoizor: options.uid must be a string!');
        });
      });
    });

    describe('keyGenerator', () => {
      it('Should throw if options.keyGenerator is defined isn\'t a function', () => {
        [1, 'string', null, {}, []].forEach((item) => {
          assert.throws(
            () => new MemoizorSync(() => {}, { keyGenerator: item }),
            'Memoizor: options.keyGenerator must be a function!');
        });
      });
    });
  });

  describe('Memoizor#setOptions', () => {
    it('Should set and validate options', () => {
      const memoizor = new MemoizorSync(() => {});
      expect(memoizor.getOption('ttl')).to.equal(undefined);
      expect(memoizor.setOptions({ ttl: 1000 })).to.equal(memoizor.memoized);
      expect(memoizor.getOption('ttl')).to.equal(1000 * 1e6);
    });

    it('Should clear the store if the "clear" argument is true', () => {
      const memoizor = new MemoizorSync((a, b) => (a + b));
      memoizor.memoized(1, 2);
      memoizor.memoized(3, 4);

      expect(memoizor.storeContents()).to.eql({
        '30b823434ce87fd37b94ff3363d0ff9d': 3,
        b34820008f9ded2fc269268f8be1394b: 7,
      });

      expect(memoizor.setOptions({ ttl: 3000 }, true)).to.equal(memoizor.memoized);
      expect(memoizor.storeContents()).to.eql({});
    });

    const newValues = [() => {}, () => {}, 'string'];
    ['keyGenerator', 'coerceArgs', 'uid'].forEach((option, idx) => {
      it(`Should clear the store if "${option}" option is changed`, () => {
        const memoizor = new MemoizorSync((a, b) => (a + b));
        memoizor.memoized(1, 2);
        memoizor.memoized(3, 4);

        expect(memoizor.storeContents()).to.eql({
          '30b823434ce87fd37b94ff3363d0ff9d': 3,
          b34820008f9ded2fc269268f8be1394b: 7,
        });

        expect(memoizor.setOptions({ [option]: newValues[idx] })).to.equal(memoizor.memoized);
        expect(memoizor.storeContents()).to.eql({});
      });
    });

    it('Should do nothing if options isn\t an object', () => {
      const memoizor = new MemoizorSync((a, b) => (a + b));
      memoizor.memoized(1, 2);
      memoizor.memoized(3, 4);

      expect(memoizor.storeContents()).to.eql({
        '30b823434ce87fd37b94ff3363d0ff9d': 3,
        b34820008f9ded2fc269268f8be1394b: 7,
      });

      expect(memoizor.setOptions('whatever', true)).to.equal(memoizor.memoized);
      expect(memoizor.storeContents()).to.eql({});
    });
  });
});
