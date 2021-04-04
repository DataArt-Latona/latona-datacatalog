const _ = require("lodash");
const v = require("../util/validators");

const defaults = require("./latona-datacatalog-options-defaults.json");

const buildOptions = options => {
  const defaultsCopy = _.cloneDeep(defaults);

  if (options && options.dropDefaultCatalogs === true) {
    defaultsCopy.catalogs = {};
  }

  const mergedOptions = _.merge(defaultsCopy, options);

  v.validateOptions(mergedOptions);

  return mergedOptions;
};

module.exports = {
  defaults,
  buildOptions
};
