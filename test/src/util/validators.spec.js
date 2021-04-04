const { assert } = require("chai");
const _ = require("lodash");
const fse = require("fs-extra");
const v = require("../../../src/util/validators");

const tesOptionsFile = "./test/mocks/validators.spec/testOptions.json";

const errorMessages = {
  failedToValidateSchema: "Failed to validate schema",
  failedToValidateObject: "Failed to validate object",
  failedToValidateOptions: "Failed to validate options",
  objectExpectedTemplate: "'<%= param %>' is expected to be an object"
};

const notStrings = [
  {},
  { foo: "bar" },
  1,
  1.2,
  () => {},
  false,
  true,
  [],
  ["foo"]
];

const objExpectedMsgBuilder = _.template(errorMessages.objectExpectedTemplate);

describe("validators", () => {
  describe("#validateStringNotEmpty", () => {
    it("false if not a string or empty string", () => {
      [...notStrings, "", undefined].forEach(i => {
        assert.isFalse(v.validateStringNotEmpty(i), `test object: '${i}'`);
      });
    });
    it("true if non-empty string", () => {
      assert.isTrue(v.validateStringNotEmpty("foo"));
    });
  });
  describe("#validateStringOrEmpty", () => {
    it("false if not a string", () => {
      notStrings.forEach(i => {
        assert.isFalse(v.validateStringOrEmpty(i), `test object: '${i}'`);
      });
    });
    it("true if undefined, empty string, or non-empty string", () => {
      ["foo", "", undefined].forEach(i => {
        assert.isTrue(v.validateStringOrEmpty(i), `test object: '${i}'`);
      });
    });
  });
  describe("#validateInteger", () => {
    it("false if not an int", () => {
      [
        undefined,
        "",
        "foo",
        1.1,
        {},
        { foo: "bar" },
        () => {},
        false,
        true,
        [],
        [1]
      ].forEach(i => {
        assert.isFalse(v.validateInteger(i), `test object: '${i}'`);
      });
    });
    it("true if int", () => {
      [0, 1, 100, Number.MAX_SAFE_INTEGER].forEach(i => {
        assert.isTrue(v.validateInteger(i), `test object: '${i}'`);
      });
    });
  });
  describe("#validateObject", () => {
    it("false if not an object or empty", () => {
      [1, 1.1, "", "foo", undefined, []].forEach(i => {
        assert.isFalse(v.validateObject(i), `test object: '${i}'`);
      });
    });
    it("true if any object", () => {
      [{}, { foo: "bar" }].forEach(i => {
        assert.isTrue(v.validateObject(i), `test object: '${i}'`);
      });
    });
  });
  describe("#validateArrayNotEmpty", () => {
    it("false if not an array or empty array", () => {
      [
        undefined,
        "",
        "foo",
        1.1,
        {},
        { foo: "bar" },
        () => {},
        false,
        true,
        {},
        { foo: "bar" },
        []
      ].forEach(i => {
        assert.isFalse(v.validateArrayNotEmpty(i), `test object: '${i}'`);
      });
    });
    it("true if non-empty any array", () => {
      [[1], ["foo", "bar"]].forEach(i => {
        assert.isTrue(v.validateArrayNotEmpty(i), `test object: '${i}'`);
      });
    });
  });
  describe("#validateSchema", () => {
    it("throws if invalid json schema", () => {
      [
        { $schema: "foo", foo: "bar" },
        {
          $schema: "http://json-schema.org/draft-07/schema",
          type: "bar",
          required: ["foo"]
        }
      ].forEach(i => {
        assert.throws(
          () => {
            v.validateSchema(i);
          },
          Error,
          errorMessages.failedToValidateSchema
        );
      });
    });
    it("does not throw if valid json schema", () => {
      [
        {
          $schema: "http://json-schema.org/draft-07/schema",
          type: "object",
          properties: {
            foo: { type: "string" }
          }
        }
      ].forEach(i => {
        assert.doesNotThrow(() => {
          v.validateSchema(i);
        });
      });
    });
  });
  describe("#addonOptionsSchema", () => {
    it("validation passes", () => {
      assert.doesNotThrow(() => {
        v.validateSchema(v.addonOptionsSchema);
      });
    });
  });
  describe("#validateObjectToSchema", () => {
    it("throws if object is not provided", () => {
      assert.throws(
        () => {
          v.validateObjectToSchema();
        },
        Error,
        objExpectedMsgBuilder({ param: "obj" })
      );
    });
    it("throws if schema is not provided", () => {
      assert.throws(
        () => {
          v.validateObjectToSchema({ foo: "bar" });
        },
        Error,
        objExpectedMsgBuilder({ param: "schema" })
      );
    });
    it("throws if schema is invalid", () => {
      assert.throws(
        () => {
          v.validateObjectToSchema(
            { foo: "bar" },
            {
              $schema: "http://json-schema.org/draft-07/schema",
              type: "bar"
            }
          );
        },
        Error,
        errorMessages.failedToValidateSchema
      );
    });
    it("throws if does not comply to provided schema", () => {
      assert.throws(
        () => {
          v.validateObjectToSchema(
            { bar: ["foo"] },
            {
              $schema: "http://json-schema.org/draft-07/schema",
              type: "object",
              properties: {
                foo: { type: "string" }
              },
              required: ["foo"]
            }
          );
        },
        Error,
        errorMessages.failedToValidateObject
      );
    });
    it("does not throw if object complies with provided schema", () => {
      assert.doesNotThrow(() => {
        v.validateObjectToSchema(
          { foo: "bar" },
          {
            $schema: "http://json-schema.org/draft-07/schema",
            type: "object",
            properties: {
              foo: { type: "string" }
            },
            required: ["foo"]
          }
        );
      });
    });
  });
  describe("#validateOptions", () => {
    let testOptions;

    beforeEach(() => {
      testOptions = fse.readJSONSync(tesOptionsFile);
    });

    const assertBadOptThrows = options => {
      assert.throws(
        () => {
          v.validateOptions(options);
        },
        Error,
        errorMessages.failedToValidateOptions
      );
    };

    describe("should fail if does not comply with schema", () => {
      it("not an object", () => {
        [1, 1.1, "", "foo", undefined, []].forEach(i => {
          assert.throws(
            () => {
              v.validateOptions(i);
            },
            Error,
            objExpectedMsgBuilder({ param: "opt" })
          );
        });
      });
      it("missing outPath", () => {
        testOptions.paths.outPath = "";
        assertBadOptThrows(testOptions);
      });
      it("invalid render format", () => {
        testOptions.renderFormat = "foo";
        assertBadOptThrows(testOptions);
      });
      it("missing pageTreeFileName", () => {
        testOptions.pageTreeFileName = "";
        assertBadOptThrows(testOptions);
      });
      it("wrong name for catalog", () => {
        testOptions.catalogs.foo123 = { foo: "foo" };
        assertBadOptThrows(testOptions);
      });
      it("wrong sectionBy navigationStyle", () => {
        testOptions.catalogs.dataCatalog.sectionBy.navigationStyle = "foo";
        assertBadOptThrows(testOptions);
      });
      it("wrong section detailsStyle", () => {
        testOptions.catalogs.dataCatalog.sectionBy.first.detailsStyle = "foo";
        assertBadOptThrows(testOptions);
      });
      it("missing collection path", () => {
        testOptions.catalogs.dataCatalog.collection = "";
        assertBadOptThrows(testOptions);
      });
      it("missing collection title", () => {
        testOptions.catalogs.dataCatalog.title = "";
        assertBadOptThrows(testOptions);
      });
      it("missing collection slug", () => {
        testOptions.catalogs.dataCatalog.slug = "";
        assertBadOptThrows(testOptions);
      });
      it("missing collection details", () => {
        delete testOptions.catalogs.dataCatalog.details;
        assertBadOptThrows(testOptions);
      });
      it("missing relationshipsCollection", () => {
        delete testOptions.relationshipsCollection;
        assertBadOptThrows(testOptions);
      });
      it("missing relationshipTypesCollection", () => {
        delete testOptions.relationshipTypesCollection;
        assertBadOptThrows(testOptions);
      });
    });

    describe("should fail when options are inconsistent", () => {
      it(
        "tableLinkProperty property is not in the properties list" +
          " and details style is 'table'",
        () => {
          testOptions.catalogs.dataCatalog.sectionBy.second.tableLinkProperty =
            "foo";
          assertBadOptThrows(testOptions);

          delete testOptions.catalogs.dataCatalog.sectionBy.second;
          testOptions.catalogs.dataCatalog.sectionBy.first.tableLinkProperty =
            "foo";
          assertBadOptThrows(testOptions);
        }
      );
    });

    describe("should not fail if input complies with schema", () => {
      it("does not throw errors", () => {
        assert.doesNotThrow(() => {
          v.validateOptions(testOptions);
        });
        assert.doesNotThrow(() => {
          delete testOptions.catalogs.dataCatalog.sectionBy.second;
          v.validateOptions(testOptions);
        });
        assert.doesNotThrow(() => {
          delete testOptions.catalogs.dataCatalog.sectionBy;
          v.validateOptions(testOptions);
        });
      });
    });
  });
});
