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
        const expected = [60, 60, 60, 100, 8000];

        [0, 1, -1, 100, 8000].forEach((item, idx) => {
          const memoizor = new MemoizorSync(() => this, { ttl: item });
          expect(memoizor.ttl).to.equal(expected[idx] * 1e6);
        });
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
});
