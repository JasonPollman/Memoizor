import * as memoizor from '../../src';

describe('Memoizor Main Module', () => {
  it('Should export the expected API (default export)', () => {
    expect(memoizor.default).to.be.a('function');
    expect(memoizor.default.name).to.equal('sync');
    expect(Object.getOwnPropertyNames(memoizor.default)).to.eql([
      'length',
      'name',
      'prototype',
      'all',
      'memoize',
      'memoizeMethod',
      'async',
      'cb',
      'promise',
      'callback',
      'sync',
      'LocalStorageController',
      'LocalMapStorageController',
      'FileStorageController',
      'FileStorageControllerSync',
      'StorageController',
      'default',
    ]);
  });

  it('Should export the expected API (ESMs)', () => {
    expect(memoizor).to.be.an('object');
    const expts = Object.getOwnPropertyNames(memoizor);

    expect(expts).to.eql([
      '__esModule',
      'memoize',
      'memoizeMethod',
      'async',
      'cb',
      'promise',
      'callback',
      'sync',
      'LocalStorageController',
      'LocalMapStorageController',
      'FileStorageController',
      'FileStorageControllerSync',
      'StorageController',
      'default',
    ]);
  });
});
