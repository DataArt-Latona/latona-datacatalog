/* eslint-disable no-new */
const { assert } = require("chai");
const _ = require("lodash");
// const fse = require("fs-extra");

const {
  tablePropertyDefinitions,
  tableModel
} = require("../../mocks/pagection.spec/tableProps");
const op = require("../../../src/addonInternals/OwnProperties");

const errorMessages = {
  paramNonEmptyString: /.+should be non-empty string.*/,
  definitionsNonEmptyArray: "definitions should be non-empty array",
  definitionsNameDuplicate: "name duplication detected for property definition",
  definitionsInstanceOf:
    "definitions should be an instance of OwnPropertyDefinitions",
  definitionInstanceOf:
    "definition should be an instance of OwnPropertyDefinition",
  propInstanceOf: "prop should be an instance of OwnProperty",
  propNameNotDefined: /prop.name .* is not in definitions/,
  propAlreadyAdded: /property with name ".*" already added/,
  modelNotObject: "model expected to be an object",
  modelNotObjectOrArray: "model expected to be an object or array",
  titleShouldBeStringOrEmpty: "title should be string or empty"
};

const testValueArrayNoObject = [
  "foo",
  1.1,
  Number.MAX_VALUE,
  [],
  [1, 2, 3],
  undefined
];
const testValueArrayNoObjectNoArray = testValueArrayNoObject.filter(
  i => !Array.isArray(i)
);
const testValueArray = [{ foo: { bar: "baz" } }, ...testValueArrayNoObject];
const testValueArrayNotString = testValueArrayNoObject.filter(
  i => typeof i !== "string"
);

const goodPropertyDefinitions = [
  { name: "foo1", path: "bar", title: "baz", show: true },
  { name: "foo2", path: "bar", title: "baz", show: true }
];

const tableModelA = tableModel;

const tableModelB = { ...tableModelA, tableName: "baz-b" };

describe("OwnProperties", () => {
  describe("OwnPropertyDefinitions", () => {
    describe(".constructor", () => {
      ["name", "path", "title"].forEach(p => {
        it(`should fail if ${p} is missing or not a string`, () => {
          const def = [{ name: "foo", path: "bar", title: "baz" }];
          def[0][p] = {};

          assert.throws(
            () => {
              new op.OwnPropertyDefinitions(def);
            },
            Error,
            errorMessages.paramNonEmptyString
          );

          def[0][p] = undefined;

          assert.throws(
            () => {
              new op.OwnPropertyDefinitions(def);
            },
            Error,
            errorMessages.paramNonEmptyString
          );
        });
      });

      it("should fail if definitions is not an array or empty array", () => {
        [undefined, "foo", { foo: "bar" }, []].forEach(i => {
          assert.throws(
            () => {
              new op.OwnPropertyDefinitions(i);
            },
            Error,
            errorMessages.definitionsNonEmptyArray
          );
        });
      });
      it("should fail if there are name duplicates", () => {
        assert.throws(
          () => {
            new op.OwnPropertyDefinitions([
              { name: "foo", path: "bar", title: "baz" },
              { name: "foo", path: "bar", title: "baz" }
            ]);
          },
          Error,
          errorMessages.definitionsNameDuplicate
        );
      });
      it("should copy original objects to definitions array", () => {
        const ownDefs = new op.OwnPropertyDefinitions(goodPropertyDefinitions);

        assert.deepEqual(ownDefs.definitions, goodPropertyDefinitions);
      });
      it(
        "should convert definition object if it is not an instance of" +
          " OwnPropertyDefinitions",
        () => {
          const def = { name: "foo", title: "foo", path: "foo" };
          const ownDefs = new op.OwnPropertyDefinitions([def]);

          def.name = "bar";

          assert.notEqual(ownDefs.definitions[0].name, def.name);
        }
      );
      it(
        "should not convert definition object if it is an instance of" +
          " OwnPropertyDefinitions",
        () => {
          const def = new op.OwnPropertyDefinition({
            name: "foo",
            title: "foo",
            path: "foo"
          });
          const ownDefs = new op.OwnPropertyDefinitions([def]);

          def.name = "bar";

          assert.equal(ownDefs.definitions[0].name, def.name);
        }
      );
    });
  });
  describe("OwnProperty", () => {
    describe(".constructor", () => {
      it("should fail if definition is of wrong type or missing", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              new op.OwnProperty(i, "val");
            },
            Error,
            errorMessages.definitionInstanceOf
          );
        });
      });
      it("should copy definition, name, and value", () => {
        const def = new op.OwnPropertyDefinition(goodPropertyDefinitions[0]);
        const val = "val12334~~.00##";
        const prop = new op.OwnProperty(def, val);

        assert.isObject(prop);
        assert.equal(prop.value, val);
        assert.deepEqual(prop.definition, def);
        assert.equal(prop.name, def.name);
      });
    });
  });
  describe("OwnProperties", () => {
    describe(".constructor", () => {
      it("should fail if definitions of wrong type", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              new op.OwnProperties(i);
            },
            Error,
            errorMessages.definitionsInstanceOf
          );
        });
      });
      it("should have definitions and initialize properties array", () => {
        const propDefs = new op.OwnPropertyDefinitions(goodPropertyDefinitions);
        const props = new op.OwnProperties(propDefs);

        assert.isObject(props);
        assert.isObject(props.definitions);
        assert.deepEqual(props.definitions, propDefs);
        assert.isArray(props.properties);
        assert.isEmpty(props.properties);
      });
    });
    describe(".add", () => {
      let ownProps;

      beforeEach(() => {
        ownProps = new op.OwnProperties(
          new op.OwnPropertyDefinitions(goodPropertyDefinitions)
        );
      });

      it("should fail if property of wrong type", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              ownProps.add(i);
            },
            Error,
            errorMessages.propInstanceOf
          );
        });
      });
      it("should fail if property name is not in definitions", () => {
        assert.throws(
          () => {
            ownProps.add(
              new op.OwnProperty(
                new op.OwnPropertyDefinition({
                  name: "not_defined",
                  path: "bar",
                  title: "baz"
                }),
                "val"
              )
            );
          },
          Error,
          errorMessages.propNameNotDefined
        );
      });
      it("should fail if property already added", () => {
        assert.throws(
          () => {
            const prop = new op.OwnProperty(
              new op.OwnPropertyDefinition(goodPropertyDefinitions[0]),
              "val"
            );
            ownProps.add(prop);
            ownProps.add(prop);
          },
          Error,
          errorMessages.propAlreadyAdded
        );
      });
      it("should add property to array and return it", () => {
        const prop1 = new op.OwnProperty(
          new op.OwnPropertyDefinition(goodPropertyDefinitions[0]),
          "val"
        );
        const prop2 = new op.OwnProperty(
          new op.OwnPropertyDefinition(goodPropertyDefinitions[1]),
          "va2"
        );
        const addedProp1 = ownProps.add(prop1);
        const addedProp2 = ownProps.add(prop2);

        assert.isObject(addedProp1);
        assert.isObject(addedProp2);
        assert.lengthOf(ownProps.properties, 2);
        assert.deepEqual(addedProp1, prop1);
        assert.deepEqual(addedProp2, prop2);
      });
    });
    describe(".getPropertyByName", () => {
      let ownProps;
      const propValues = [
        {
          name: "foo1",
          value: "val1",
          show: undefined
        },
        {
          name: "foo2",
          value: "val2",
          show: undefined
        }
      ];

      beforeEach(() => {
        ownProps = new op.OwnProperties(
          new op.OwnPropertyDefinitions(goodPropertyDefinitions)
        );

        propValues.forEach(({ name, value }) => {
          const def = ownProps.definitions.definitions.find(
            d => d.name === name
          );

          ownProps.add(new op.OwnProperty(def, value));
        });
      });

      it("should return property if exists", () => {
        const prop = ownProps.getPropertyByName(propValues[0].name);

        assert.isObject(prop);
        assert.equal(prop.value, propValues[0].value);
        assert.equal(prop.name, propValues[0].name);
        assert.equal(prop.definition.name, propValues[0].name);
      });
      it("should return undefined if property doesn't if exist", () => {
        const prop = ownProps.getPropertyByName("not a prop name");
        assert.isUndefined(prop);
      });
    });
    describe(".hasVisible and .visibleProperties", () => {
      it("should return only visible properties", () => {
        const defs = new op.OwnPropertyDefinitions([
          { name: "foo10", path: "bar", title: "baz", show: false },
          { name: "foo20", path: "bar", title: "baz", show: false },
          { name: "foo30", path: "bar", title: "baz", show: false },
          ...goodPropertyDefinitions
        ]);

        const props = new op.OwnProperties(defs);

        defs.definitions.forEach(d => {
          props.add(new op.OwnProperty(d, "val"));
        });

        assert.isTrue(props.hasVisible);
        assert.lengthOf(props.visibleProperties, 2);
      });
      it("should return nothing if there are no visible properties", () => {
        const defs = new op.OwnPropertyDefinitions([
          { name: "foo10", path: "bar", title: "baz", show: false },
          { name: "foo20", path: "bar", title: "baz", show: false },
          { name: "foo30", path: "bar", title: "baz", show: false }
        ]);

        const props = new op.OwnProperties(defs);

        defs.definitions.forEach(d => {
          props.add(new op.OwnProperty(d, "val"));
        });

        assert.isFalse(props.hasVisible);
        assert.lengthOf(props.visibleProperties, 0);
      });
    });
    describe(".prototype.makeFromModel", () => {
      it("should fail if model is not an object", () => {
        testValueArrayNoObject.forEach(i => {
          assert.throws(
            () => {
              op.OwnProperties.makeFromModel(i, goodPropertyDefinitions);
            },
            Error,
            errorMessages.modelNotObject
          );
        });
      });
      it("should fail if definitions of wrong type", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              op.OwnProperties.makeFromModel({}, i);
            },
            Error,
            errorMessages.definitionsInstanceOf
          );
        });
      });
      it(
        "should return OwnProperties object with all defined properties" +
          " and resolved values",
        () => {
          const ownPropDefs = new op.OwnPropertyDefinitions(
            tablePropertyDefinitions
          );
          const ownProps = op.OwnProperties.makeFromModel(
            tableModelA,
            ownPropDefs
          );

          assert.isArray(ownProps.properties);
          assert.lengthOf(ownProps.properties, 4);
          ownProps.properties.forEach(p => {
            assert.isDefined(p.name);
            assert.isDefined(p.value);
          });

          assert.equal(ownProps.getPropertyByName("db").value, tableModelA.db);
          assert.equal(
            ownProps.getPropertyByName("schema").value,
            tableModelA.schema
          );
          assert.equal(
            ownProps.getPropertyByName("tableName").value,
            tableModelA.tableName
          );
          assert.equal(
            ownProps.getPropertyByName("fieldCount").value,
            tableModelA.fields.length
          );
        }
      );
      it("should not fail if value is missing", () => {
        [
          { drop: "schema", check: "schema" },
          { drop: "fields", check: "fieldCount" }
        ].forEach(({ drop, check }) => {
          const model = _.cloneDeep(tableModelA);
          model[drop] = undefined;

          assert.doesNotThrow(() => {
            const ownPropDefs = new op.OwnPropertyDefinitions(
              tablePropertyDefinitions
            );
            const ownProps = op.OwnProperties.makeFromModel(model, ownPropDefs);

            const schemaProp = ownProps.getPropertyByName(check);
            assert.isObject(schemaProp);
            assert.equal(schemaProp.name, check);
            assert.isUndefined(schemaProp.value);
          });
        });
      });
    });
  });
  describe("OwnCollection", () => {
    let tableDefs;

    beforeEach(() => {
      tableDefs = new op.OwnPropertyDefinitions(tablePropertyDefinitions);
    });

    describe(".constructor", () => {
      it("should copy title", () => {
        const title = "Foo Title";
        const coll = new op.OwnCollection({
          title,
          definitions: tableDefs
        });

        assert.isString(coll.title);
        assert.equal(coll.title, title);
      });
      it("should fail if title is not a string", () => {
        testValueArrayNotString
          .filter(i => i !== undefined)
          .forEach(i => {
            assert.throws(
              () => {
                new op.OwnCollection({
                  title: i,
                  definitions: tableDefs
                });
              },
              Error,
              errorMessages.titleShouldBeStringOrEmpty
            );
          });
      });
      it("should not fail if title is not defined", () => {
        assert.doesNotThrow(() => {
          new op.OwnCollection({
            definitions: tableDefs
          });
        });
      });
      it("should fail if definitions are invalid", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              new op.OwnCollection({
                definitions: i
              });
            },
            Error,
            errorMessages.definitionsInstanceOf
          );
        });
      });
      it("should create empty rows array", () => {
        const coll = new op.OwnCollection({
          definitions: tableDefs
        });
        assert.isArray(coll.rows);
        assert.lengthOf(coll.rows, 0);
      });
    });
    describe(".addRow", () => {
      it("should return OwnProperties object", () => {
        const coll = new op.OwnCollection({
          definitions: tableDefs
        });
        const props = coll.addRow(tableModelA);
        assert.instanceOf(props, op.OwnProperties);
      });
      it("should fail if model is not an object", () => {
        const coll = new op.OwnCollection({
          definitions: tableDefs
        });

        testValueArrayNoObject.forEach(i => {
          assert.throws(
            () => {
              coll.addRow(i);
            },
            Error,
            errorMessages.modelNotObject
          );
        });
      });
    });
    describe(".prototype.makeFromCollection", () => {
      const makeTableCollectionAndAssert = (model, tblANAme, tblBName) => {
        const coll = op.OwnCollection.makeFromCollection(
          model,
          new op.OwnPropertyDefinitions(tablePropertyDefinitions)
        );
        assert.instanceOf(coll, op.OwnCollection);
        assert.lengthOf(coll.rows, 2);
        assert.equal(
          coll.rows[0].getPropertyByName("tableName").value,
          tblANAme
        );
        assert.equal(
          coll.rows[1].getPropertyByName("tableName").value,
          tblBName
        );
      };

      it("should fail if definitions of wrong type", () => {
        testValueArray.forEach(i => {
          assert.throws(
            () => {
              op.OwnCollection.makeFromCollection(
                [tableModelA, tableModelB],
                i
              );
            },
            Error,
            errorMessages.definitionsInstanceOf
          );
        });
      });
      it("should fail if collection element is not an object or an array", () => {
        testValueArrayNoObjectNoArray.forEach(i => {
          assert.throws(
            () => {
              op.OwnCollection.makeFromCollection(i, tablePropertyDefinitions);
            },
            Error,
            errorMessages.modelNotObjectOrArray
          );
        });
      });
      it("should return OwnCollection with rows for each property in object", () => {
        const model = { tblA: tableModelA, tblB: tableModelB };
        makeTableCollectionAndAssert(
          model,
          tableModelA.tableName,
          tableModelB.tableName
        );
      });
      it("should return OwnCollection with rows for each element in array", () => {
        const model = [tableModelA, tableModelB];
        makeTableCollectionAndAssert(
          model,
          tableModelA.tableName,
          tableModelB.tableName
        );
      });
    });
  });
});
