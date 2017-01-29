/**
 * Contains the FileStorageController class, which extends the LocalStorageController
 * and adds the functionality of loading/storing results from a file.
 * @file
 */

import { EOL as eol } from 'os';
import nodefs from 'fs';
import LocalStorageController from './Local';

const fs = Promise.promisifyAll(nodefs);

/**
 * Used to privatize members of the FileStorageController class.
 * @type {symbol}
 */
const ps = Symbol();

/**
 * Used to delimit values in the store file.
 * @type {string}
 */
const DELIMITER = '|';

/**
 * A file storage controller which extends the LocalStorageController
 * and adds the functionality of loading/storing results from a file.
 * @class LocalStorageController
 * @extends {StorageController}
 * @export
 */
export default class FileStorageControllerSync extends LocalStorageController {
  constructor(path) {
    super();

    // Defines the local store object.
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        path,
      },
    });
  }

  /**
   * Initializes the current FileStorageController by reading the store file
   * and adding the values to the local memory.
   * @returns {FileStorageController} The current FileStorageController instance.
   * @memberof FileStorageController
   */
  init() {
    let stored;

    try {
      stored = fs.readFileSync(this[ps].path, 'utf8');
    } catch (e) {
      // Store file likely doesn't exist.
      return this;
    }

    // Split by newline
    const lines = stored.split(/\r?\n/);

    // Parsed the stored values and add them to the local store.
    lines.forEach((line) => {
      if (!line) return;
      const delimiterIndex = line.indexOf(DELIMITER);

      if (delimiterIndex !== -1) {
        const key = line.substring(0, delimiterIndex);
        const value = line.substring(delimiterIndex + DELIMITER.length, line.length);
        super.save(key, JSON.parse(value));
      }
    });

    if (lines[lines.length - 1] !== '') fs.appendFileSync(this[ps].path, eol);
    return this;
  }

  /**
   * The LocalStorageController save implementation.
   * @param {string} key The unique key for the arguments signature.
   * @param {any} value The value produced by the memoized function,
   * @param {Array<any>} args The arguments signature used for storage and to generate the key.
   * given the "signature" defined by "key".
   * @param {Memoizor} memorizr The Memoizor instance associated with the memoized function.
   * @returns {undefined}
   * @override
   */
  save(key, value, ...rest) {
    fs.appendFileSync(this[ps].path, `${key}${DELIMITER}${JSON.stringify(value)}${eol}`);
    return super.save(key, value, ...rest);
  }

  delete(key, ...rest) {
    const contents = fs.readFileSync(this[ps].path, 'utf8');
    const lines = contents.trim().split(/\r?\n/);

    // Parsed the stored values and add them to the local store.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (new RegExp(`^${key}`).test(line)) {
        lines.splice(i, 1);
        break;
      }
    }

    fs.writeFileSync(this[ps].path, `${lines.join(eol)}${eol}`);
    return super.delete(key, ...rest);
  }

  empty(...args) {
    fs.writeFileSync(this[ps].path, '');
    return super.empty(...args);
  }
}
