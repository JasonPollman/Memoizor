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

  describe('MemoizorPromise#delete', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorPromise(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should delete cached items', async () => {
      await Promise.all([
        memoized(4),
        memoized(9),
        memoized(5),
        memoized(6),
        memoized(7),
        memoized(4),
      ]);

      expect(Object.keys(memoized.storeContents()).length).to.equal(5);
      await Promise.all([
        memoized.delete([4]),
        memoized.delete([8]),
        memoized.delete([5], true),
        memoized.delete([6], true),
        memoized.delete([7], true),
        memoized.delete([9], true),
      ]);
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
    });

    it('Should delete cached items (using arguments object)', async () => {
      await memoized(4);
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      await (async function foo() { await memoized.delete(arguments); }(4)); // eslint-disable-line prefer-rest-params, max-len
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
    });
  });

  describe('MemoizorPromise#save', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorPromise(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should add cached items', async () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      await memoized.save('foobar', [4]);
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      expect(await memoized(4)).to.equal('foobar');
    });

    it('Should add cached items (using arguments object)', async () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      await (async function foo() { await memoized.save('foobar', arguments); }(4)); // eslint-disable-line prefer-rest-params
      expect(Object.keys(memoized.storeContents()).length).to.equal(1);
      expect(await memoized(4)).to.equal('foobar');
    });
  });

  describe('MemoizorPromise#get', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorPromise(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should retrieve cached items', async () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      await memoized.save('foobar', [4]);
      await memoized(1);
      await memoized(1, 2);
      expect(Object.keys(memoized.storeContents()).length).to.equal(3);
      expect(await memoized.get([1], true)).to.equal(2);
      expect(await memoized.get([1])).to.equal(2);
      expect(await memoized.get([1, 2])).to.equal(2);
      expect(await memoized.get([4])).to.equal('foobar');
    });

    it('Should retrieve cached items (using arguments object)', async () => {
      expect(Object.keys(memoized.storeContents()).length).to.equal(0);
      await memoized.save('foobar', [4]);
      await memoized(1);
      await memoized(1, 2);
      expect(Object.keys(memoized.storeContents()).length).to.equal(3);

      /* eslint-disable prefer-rest-params */
      expect(await (async function foo() { return await memoized.get(arguments); }(1))).to.equal(2);
      expect(await (async function foo() { return await memoized.get(arguments); }(1, 2))).to.equal(2); // eslint-disable-line max-len
      expect(await (async function foo() { return await memoized.get(arguments); }(4))).to.equal('foobar');
    });
  });



  describe('MemoizorPromise#unmemoize', () => {
    let memoizor;
    let memoized;

    beforeEach(() => {
      memoizor = new MemoizorPromise(x => x * 2);
      memoized = memoizor.memoized;
    });

    it('Should disable memoization', (done) => {
      (async () => {
        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);

        expect(memoized.storeContents()).to.eql({
          '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
          '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
          '632773fc94f12205d3b270c3381619c5': 18,
        });

        await memoized.clear();
        await memoized.unmemoize();
        memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
        memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);
        expect(memoized.storeContents()).to.eql({});
        done();
      })()
      .catch(done);
    });

    it('Should clear the store if the "clear" argument is true', (done) => {
      (async () => {
        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);

        expect(memoized.storeContents()).to.eql({
          '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
          '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
          '632773fc94f12205d3b270c3381619c5': 18,
        });

        await memoized.unmemoize(true);
        memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
        memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);
        expect(memoized.storeContents()).to.eql({});
        done();
      })()
      .catch(done);
    });

    it('Should *not* the store if the "clear" argument is falsy', (done) => {
      (async () => {
        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);

        expect(memoized.storeContents()).to.eql({
          '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
          '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
          '632773fc94f12205d3b270c3381619c5': 18,
        });

        await memoized.unmemoize();
        memoized.memoizor.on('save', () => done(new Error('Shouldn\'t have called the memoized function!')));
        memoized.memoizor.on('retrieve', () => done(new Error('Shouldn\'t have called the memoized function!')));

        expect(await memoized(0)).to.equal(0);
        expect(await memoized(7)).to.equal(14);
        expect(await memoized(9)).to.equal(18);

        expect(memoized.storeContents()).to.eql({
          '4eb5aaba3b7a885eb9115e9bee326aa4': 0,
          '2b9b5b4dceb4e1ff960afe469fa56f18': 14,
          '632773fc94f12205d3b270c3381619c5': 18,
        });

        done();
      })()
      .catch(done);
    });
  });
});
