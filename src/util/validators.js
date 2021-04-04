/**
 * Defines simple validators for parameters
 * @private
 */
const Ajv = require("ajv");
const _ = require("lodash");
const addonOptionsSchema = require("../addonInternals/latona-datacatalog-options-schema.json");

/**
 * Checks if `s` is string and is not empty
 * @param {string} s
 * @returns {boolean}
 */
const validateStringNotEmpty = s => !!s && typeof s === "string";

/**
 * Checks if `s` is string or is empty or undefined
 * @param {string} s
 * @returns {boolean}
 */
const validateStringOrEmpty = s =>
  validateStringNotEmpty(s) || (!s && typeof s === "string") || s === undefined;

/**
 * Checks if `s` is integer
 * @param {int} i
 * @returns {boolean}
 */
const validateInteger = i => Number.isInteger(i);

/**
 * Checks if `obj` is object (may be empty)
 * @param {Object} obj
 * @returns {boolean}
 */
const validateObject = obj =>
  !!obj && typeof obj === "object" && obj.toString() === "[object Object]";

/**
 * Checks if `arr` is an array and has at least 1 element
 * @param {Array} arr
 * @returns {boolean}
 */
const validateArrayNotEmpty = arr => Array.isArray(arr) && arr.length > 0;

/**
 * Validates if schema is correct
 * @param {Object} schema
 * @returns {void}
 */
const validateSchema = schema => {
  const ajv = new Ajv();
  try {
    const isValid = ajv.validateSchema(schema);
    if (!isValid) throw new Error(`${JSON.stringify(ajv.errors)}`);
  } catch (err) {
    throw new Error(`Failed to validate schema: ${err}`);
  }
};

/**
 * Validates if object complies with schema
 * @param {Object} obj
 * @param {Object} schema
 * @returns {void}
 */
const validateObjectToSchema = (obj, schema) => {
  if (!validateObject(obj))
    throw new Error("'obj' is expected to be an object");
  if (!validateObject(schema))
    throw new Error("'schema' is expected to be an object");

  validateSchema(schema);

  const ajv = new Ajv();
  try {
    const isValid = ajv.validate(schema, obj);
    if (!isValid) throw new Error(`${JSON.stringify(ajv.errors)}`);
  } catch (err) {
    throw new Error(`Failed to validate object: ${err}`);
  }
};

/**
 * Validates options object (mostly via schema)
 * @param {Object} opt options object
 */
const validateOptions = opt => {
  if (!validateObject(opt))
    throw new Error("'opt' is expected to be an object");

  try {
    validateObjectToSchema(opt, addonOptionsSchema);

    _.forEach(opt.catalogs, (v, k) => {
      if (v.sectionBy) {
        ["first", "second"].forEach(sectionName => {
          const section = v.sectionBy[sectionName];
          if (section) {
            if (
              !section.properties.some(
                p => p.name === section.tableLinkProperty
              )
            ) {
              throw new Error(
                `tableLinkProperty for the "${sectionName}" section of the "${k}"` +
                  ` collection (${section.tableLinkProperty}) is not in the` +
                  ` properties list`
              );
            }
          }
        });
      }
    });
  } catch (err) {
    throw new Error(`Failed to validate options: ${err}`);
  }
};

module.exports = {
  addonOptionsSchema,
  validateStringNotEmpty,
  validateStringOrEmpty,
  validateInteger,
  validateObject,
  validateArrayNotEmpty,
  validateSchema,
  validateObjectToSchema,
  validateOptions
};
