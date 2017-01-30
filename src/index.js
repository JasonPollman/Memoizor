import memoizorSync, * as memoizor from './lib/exports-wrapper';

Object.assign(exports, memoizor);
export default memoizorSync;

Object.assign(exports.default, exports);

