/**
 * Contains the FileStorageController class, which extends the LocalStorageController
 * and adds the functionality of loading/storing results from a file.
 * @file
 */

import { EOL as eol } from 'os';
import nodefs from 'fs';
import LocalStorageController from './LocalStorageController';

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
export default class FileStorageController extends LocalStorageController {
  constructor(path) {
    super();

    // Defines the local store object.
    Object.defineProperty(this, ps, {
      configurable: false,
      enumerable: false,
      value: {
        writable: fs.createWriteStream(path, { flags: 'a' }),
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
  async init() {
    let stored;

    try {
      stored = await fs.readFileAsync(this[ps].path);
    } catch (e) {
      // Store file likely doesn't exist.
      return this;
    }

    // Split by newline
    const lines = stored.toString('utf8').trim().split(/\r?\n/);

    // Parsed the stored values and add them to the local store.
    await Promise.map(lines, async (line) => {
      if (!line) return;
      const delimiterIndex = line.indexOf(DELIMITER);

      if (delimiterIndex !== -1) {
        const key = line.substring(0, delimiterIndex);
        const value = line.substring(delimiterIndex + DELIMITER.length, line.length);
        await this.save(key, null, JSON.parse(value));
      }
    });

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
    this[ps].writable.write(`${key}${DELIMITER}${JSON.stringify(value)}${eol}`);
    super.save(key, value, ...rest);
  }
}
