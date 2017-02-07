import StorageController from '../../src/lib/storage-controllers/StorageController';

export default class LocalStorageController extends StorageController {
  save() {
    throw new Error('oops save');
  }

  retrieve() {
    throw new Error('oops retrieve');
  }

  delete() {
    throw new Error('oops delete');
  }

  empty() {
    throw new Error('oops empty');
  }

  contents() {
    throw new Error('oops contents');
  }
}
