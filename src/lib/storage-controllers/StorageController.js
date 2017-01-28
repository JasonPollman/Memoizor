/**
 * Contains the base, abstract StorageController class, which all other storage controllers
 * must extend.
 * @file
 */

import { EOL as eol } from 'os';

/**
 * A super class for all storage controllers to extend.
 * @export
 * @class StorageController
 */
export default class StorageController {
  constructor() {
    this.missingImplementationErrorMessage = method =>
      (Object.getPrototypeOf(this) === StorageController.prototype
        ? 'The StorageController is an abstract class and must be subclassed. It cannot be used directly.'
        : `${this.constructor.name || '[Subclass of StorageController]'}` +
          `#${method}: method not implemented.${eol}` +
          'Subclasses of StorageController must implement this method!');
  }

  /**
   * Throws an error if the subclass doesn't implement this method.
   * @throws Error
   * @memberof StorageController
   */
  save() {
    throw new Error(this.missingImplementationErrorMessage('save'));
  }

  /**
   * Throws an error if the subclass doesn't implement this method.
   * @throws Error
   * @memberof StorageController
   */
  retrieve() {
    throw new Error(this.missingImplementationErrorMessage('retrieve'));
  }

  /**
   * Throws an error if the subclass doesn't implement this method.
   * @throws Error
   * @memberof StorageController
   */
  delete() {
    throw new Error(this.missingImplementationErrorMessage('delete'));
  }

  /**
   * Throws an error if the subclass doesn't implement this method.
   * @throws Error
   * @memberof StorageController
   */
  empty() {
    throw new Error(this.missingImplementationErrorMessage('empty'));
  }
}
