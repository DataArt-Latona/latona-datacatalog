const { assert } = require("chai");
const _ = require("lodash");
const fse = require("fs-extra");

const v = require("../../../src/util/validators");
const ob = require("../../../src/addonInternals/optionsBuilder");

const defaultsFromJson = fse.readJSONSync(
  "./src/addonInternals/latona-datacatalog-options-defaults.json"
);
const simpleCatalog = fse.readJSONSync(
  "./test/mocks/optionsBuilder.spec/simpleCatalog.json"
);

const errorMessages = {
  failedToValidateOptions: "Failed to validate options"
};

describe("optionsBuilder", () => {
  describe("#buildOptions", () => {
    it("should fail if merged options do not comply with schema", () => {
      assert.throws(
        () => {
          ob.buildOptions({ foo: "bar" });
        },
        Error,
        errorMessages.failedToValidateOptions
      );
    });

    it("defaults object stay unaffected", () => {
      assert.doesNotThrow(() => {
        ob.buildOptions({
          paths: {
            outPath: "."
          }
        });
      });

      assert.deepEqual(ob.defaults, defaultsFromJson);
    });
    it("drops default catalogs if dropDefaultCatalogs is true", () => {
      let o = ob.buildOptions({ dropDefaultCatalogs: true });
      assert.isObject(o.catalogs);
      assert.isEmpty(o.catalogs);

      o = ob.buildOptions({
        catalogs: { simpleCatalog },
        dropDefaultCatalogs: true
      });
      assert.isObject(o.catalogs);
      assert.isNotEmpty(o.catalogs);
      assert.isObject(o.catalogs.simpleCatalog);
      assert.deepEqual(o.catalogs.simpleCatalog, simpleCatalog);
    });
    it("keeps default catalogs if dropDefaultCatalogs not set", () => {
      let o = ob.buildOptions({});
      assert.isObject(o.catalogs);
      assert.isNotEmpty(o.catalogs);
      assert.isObject(o.catalogs.dataCatalog);
      assert.isNotEmpty(o.catalogs.dataCatalog);
      assert.deepEqual(
        o.catalogs.dataCatalog,
        defaultsFromJson.catalogs.dataCatalog
      );

      o = ob.buildOptions({
        catalogs: { simpleCatalog }
      });
      assert.isObject(o.catalogs);
      assert.isNotEmpty(o.catalogs);
      assert.isObject(o.catalogs.dataCatalog);
      assert.isNotEmpty(o.catalogs.dataCatalog);
      assert.deepEqual(
        o.catalogs.dataCatalog,
        defaultsFromJson.catalogs.dataCatalog
      );
      assert.isObject(o.catalogs.simpleCatalog);
      assert.deepEqual(o.catalogs.simpleCatalog, simpleCatalog);
    });
    it("merge result should comply with schema", () => {
      assert.doesNotThrow(() => {
        const o = ob.buildOptions({
          catalogs: { simpleCatalog }
        });
        v.validateOptions(o);
      });
    });
    it("property arrays are replaced, not merged", () => {
      const opt = {
        catalogs: {
          dataCatalog: {
            sectionBy: {
              first: {
                properties: [
                  { name: "foo", path: "foo", title: "Foo", show: false },
                  { name: "bar", path: "bar", title: "Bar", show: false },
                  { name: "baz", path: "baz", title: "Baz", show: false }
                ],
                tableLinkProperty: "foo"
              }
            }
          }
        }
      };
      const o = ob.buildOptions(opt);

      ["catalogs.dataCatalog.sectionBy.first.properties"].forEach(i => {
        assert.deepEqual(_.get(o, i), _.get(opt, i));
      });

      ["catalogs.dataCatalog.sectionBy.second"].forEach(i => {
        assert.deepEqual(_.get(o, i), _.get(defaultsFromJson, i));
      });
    });
    it("objects are merged, not replaced", () => {
      const opt = {
        catalogs: {
          dataCatalog: {
            collection: "collections.tables",
            sectionBy: {
              first: {
                inParentAs: "linkTable"
              }
            }
          }
        }
      };
      const o = ob.buildOptions(opt);

      [
        "catalogs.dataCatalog.collection",
        "catalogs.dataCatalog.sectionBy.first.detailsStyle"
      ].forEach(i => {
        assert.deepEqual(_.get(o, i), _.get(opt, i));
      });

      [
        "catalogs.dataCatalog.title",
        "catalogs.dataCatalog.title",
        "catalogs.dataCatalog.sectionBy.second",
        "catalogs.dataCatalog.details",
        "catalogs.dataCatalog.detailsCollections"
      ].forEach(i => {
        assert.deepEqual(_.get(o, i), _.get(defaultsFromJson, i));
      });
    });
  });
  describe("#defaults", () => {
    it("should return non-empty object", () => {
      assert.isObject(ob.defaults);
      assert.isNotEmpty(ob.defaults);
    });
    it("should match source json", () => {
      assert.deepEqual(ob.defaults, defaultsFromJson);
    });
    it("defaults should comply with schema", () => {
      assert.doesNotThrow(() => {
        v.validateOptions(ob.defaults);
      });
    });
  });
});
