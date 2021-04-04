/* eslint-disable no-new */
const { assert } = require("chai");
const _ = require("lodash");

const {
  tablePropertyDefinitions,
  tableModel,
  fieldPropertyDefinitions
} = require("../../mocks/pagection.spec/tableProps");

const Pagection = require("../../../src/addonInternals/Pagection");
const op = require("../../../src/addonInternals/OwnProperties");

const errorMessages = {
  expectedNonEmptyString: /.+ is expected to be non-empty string/,
  unknownChildrenStyle: /Unknown children style ".*"/,
  noTableLinkProperty:
    'tableLinkProperty should be non-empty string for "linkTable" children style',
  emptyChildrenPropertiesDefinitions:
    'childrenPropertiesDefinitions should be non-empty array for "linkTable" children style',
  modelNotObject: "model should be an object",
  badPropertyDefinitions: "property definitions should be non-empty array",
  badCollectionsDefinition: "collections definition should be an object",
  badCollectionPath: "'collection' should be non-empty string",
  childNotPagection: "child should be Pagection",
  pagectionCantHaveChildren: "this pagection cannot have children",
  pagectionHasNoProperty: /Pagection .+ has no property ".+"/
};

const testArrNoNonEmptyString = [
  undefined,
  "",
  1.1,
  Number.MAX_VALUE,
  [],
  [1, 2, 3],
  {},
  { foo: "bar" }
];

const testArrTruthyNoObject = ["foo", 1.1, Number.MAX_VALUE, [1, 2, 3]];
const testArrTruthyNoArray = ["foo", 1.1, Number.MAX_VALUE, {}, { foo: "bar" }];
const testArray = [...testArrNoNonEmptyString, "foo"];

describe("Pagection", () => {
  describe(".constructor", () => {
    it("should fail if title is not non-empty string", () => {
      testArrNoNonEmptyString.forEach(i => {
        assert.throws(
          () => {
            new Pagection({ title: i, slug: "slug", model: tableModel });
          },
          Error,
          errorMessages.expectedNonEmptyString
        );
      });
    });
    it("should fail if slug is not non-empty string", () => {
      testArrNoNonEmptyString.forEach(i => {
        assert.throws(
          () => {
            new Pagection({ title: "title", slug: i, model: tableModel });
          },
          Error,
          errorMessages.expectedNonEmptyString
        );
      });
    });
    it("should fail if wrong children style", () => {
      assert.throws(
        () => {
          new Pagection({
            title: "title",
            slug: "slug",
            model: tableModel,
            childrenStyle: "foo"
          });
        },
        Error,
        errorMessages.unknownChildrenStyle
      );
    });
    it(
      "should fail if tableLinkProperty property is empty" +
      " and children style is linkTable",
      () => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "linkTable",
              childrenPropertiesDefinitions: fieldPropertyDefinitions
            });
          },
          Error,
          errorMessages.noTableLinkProperty
        );
      }
    );
    it(
      "should fail if childrenPropertiesDefinitions property is invalid" +
      " and children style is linkTable",
      () => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "linkTable",
              tableLinkProperty: "fieldName"
            });
          },
          Error,
          errorMessages.emptyChildrenPropertiesDefinitions
        );
      }
    );
    it("should ignore linkTable-specific properties for other styles", () => {
      ["linkList", "section"].forEach(style => {
        assert.doesNotThrow(() => {
          new Pagection({
            title: "title",
            slug: "slug",
            model: tableModel,
            childrenStyle: style
          });

          new Pagection({
            title: "title",
            slug: "slug",
            model: tableModel,
            childrenStyle: style,
            tableLinkProperty: "fieldName"
          });

          new Pagection({
            title: "title",
            slug: "slug",
            model: tableModel,
            childrenStyle: style,
            childrenPropertiesDefinitions: fieldPropertyDefinitions
          });
        });
      });
    });
    it("should create linkTable OwnCollection for style=linkTable", () => {
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "linkTable",
        childrenPropertiesDefinitions: fieldPropertyDefinitions,
        tableLinkProperty: "fieldName"
      });

      assert.instanceOf(p.linkTable, op.OwnCollection);
      assert.isUndefined(p.linkList);
      assert.isUndefined(p.sections);
    });
    it("should create linkList array for style=linkList", () => {
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "linkList"
      });

      assert.isUndefined(p.linkTable);
      assert.doesNotHaveAnyKeys(p, ["linkTable", "tableLinkProperty"]);
      assert.isArray(p.linkList);
      assert.isEmpty(p.linkList);
      assert.isUndefined(p.sections);
    });
    it("should create sections array for style=section", () => {
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "section"
      });

      assert.isUndefined(p.linkTable);
      assert.doesNotHaveAnyKeys(p, ["linkTable", "tableLinkProperty"]);
      assert.isUndefined(p.linkList);
      assert.isArray(p.sections);
      assert.isEmpty(p.sections);
    });
    it("should create own props when model and definitions available", () => {
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "section",
        propertiesDefinitions: tablePropertyDefinitions
      });

      assert.isDefined(p.properties);
      assert.instanceOf(p.properties, op.OwnProperties);
      assert.lengthOf(p.properties.properties, 4);
    });
    it("should fail if model not an object", () => {
      testArrTruthyNoObject.forEach(i => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: i,
              childrenStyle: "section",
              collectionsDefinitions: {
                foo: {
                  heading: "foo",
                  collection: "fields",
                  properties: fieldPropertyDefinitions
                }
              }
            });
          },
          Error,
          errorMessages.modelNotObject
        );

        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: i,
              childrenStyle: "section",
              propertiesDefinitions: tablePropertyDefinitions
            });
          },
          Error,
          errorMessages.modelNotObject
        );
      });
    });
    it("should fail if property definitions are badly defined", () => {
      testArrTruthyNoArray.forEach(i => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "section",
              propertiesDefinitions: i
            });
          },
          Error,
          errorMessages.badPropertyDefinitions
        );
      });
    });
    it("should create own collections when model and definitions available", () => {
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "section",
        collectionsDefinitions: {
          foo: {
            heading: "foo",
            collection: "fields",
            properties: fieldPropertyDefinitions
          },
          bar: {
            heading: "bar",
            collection: "fields",
            properties: fieldPropertyDefinitions
          }
        }
      });

      assert.isArray(p.ownCollections);
      assert.lengthOf(p.ownCollections, 2);
      p.ownCollections.forEach(c => {
        assert.instanceOf(c, op.OwnCollection);
        assert.isArray(c.rows);
        assert.lengthOf(c.rows, 3);
      });
    });
    it("should fail if collections are badly defined", () => {
      testArrTruthyNoObject.forEach(i => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "section",
              collectionsDefinitions: i
            });
          },
          Error,
          errorMessages.badCollectionsDefinition
        );
      });

      testArrTruthyNoArray.forEach(i => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "section",
              collectionsDefinitions: {
                foo: {
                  heading: "foo",
                  collection: "fields",
                  properties: i
                }
              }
            });
          },
          Error,
          errorMessages.badPropertyDefinitions
        );
      });

      testArrNoNonEmptyString.forEach(i => {
        assert.throws(
          () => {
            new Pagection({
              title: "title",
              slug: "slug",
              model: tableModel,
              childrenStyle: "section",
              collectionsDefinitions: {
                foo: {
                  heading: "foo",
                  collection: i,
                  properties: fieldPropertyDefinitions
                }
              }
            });
          },
          Error,
          errorMessages.badCollectionPath
        );
      });
    });
    it("should add custom content", () => {
      const customContent = "lorem ipsum";
      const p = new Pagection({
        title: "title",
        slug: "slug",
        model: tableModel,
        childrenStyle: "section",
        customContent
      });

      assert.isString(p.customContent);
      assert.equal(p.customContent, customContent);
    });
    it("should set parent if provided", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "section"
      });

      const f = new Pagection({
        title: "field title",
        slug: "field-slug",
        model: tableModel.fields[0],
        childrenStyle: "section",
        parent: p
      });

      assert.deepEqual(f.parent, p);
    });
  });

  describe("getters", () => {
    const pageData = {
      title: "table title",
      slug: "table-slug",
      model: tableModel,
      childrenStyle: 'linkList'
    };

    it("hasLinkList should return true if linkList is present", () => {
      const p = new Pagection(pageData);

      assert.equal(p.hasLinkList, true);
    });

    it("hasLinkList should return false if linkList is absent", () => {
      pageData.childrenStyle = 'section';
      const p = new Pagection(pageData);

      assert.equal(p.hasLinkList, false);
    });

    it("hasSections should return true if sections is present", () => {
      pageData.childrenStyle = 'section';
      const p = new Pagection(pageData);

      assert.equal(p.hasSections, true);
    });

    it("hasSections should return false if sections is absent", () => {
      pageData.childrenStyle = 'linkList';
      const p = new Pagection(pageData);

      assert.equal(p.hasSections, false);
    });

    it("hasSections should return false if sections is absent", () => {
      pageData.childrenStyle = 'linkList';
      const p = new Pagection(pageData);

      assert.equal(p.hasSections, false);
    });

    it("hasProperties should return true if properties has show field", () => {
      pageData.propertiesDefinitions = _.cloneDeep(tablePropertyDefinitions);
      pageData.propertiesDefinitions[0].show = 'show';
      const p = new Pagection(pageData);

      assert.equal(p.hasProperties, true);
    });

    it("hasProperties should return false if properties doesn't have show field", () => {
      pageData.propertiesDefinitions = _.cloneDeep(tablePropertyDefinitions);
      delete pageData.propertiesDefinitions[0].show;
      const p = new Pagection(pageData);

      assert.equal(p.hasProperties, false);
    });

    it("hasLinkTable should return true if linkTable is present", () => {
      pageData.childrenStyle = 'linkTable';
      pageData.tableLinkProperty = "fieldName";
      pageData.childrenPropertiesDefinitions = fieldPropertyDefinitions.filter(
        def => def.showInLinkTable
      )
      const p = new Pagection(pageData);

      assert.equal(p.hasLinkTable, true);
    });

    it("hasLinkTable should return false if linkTable is absent", () => {
      const p = new Pagection(pageData);

      assert.equal(p.hasLinkTable, true);
    });

    it("hasCollections should return true if ownCollections is present", () => {
      pageData.collectionsDefinitions = {
        foo: {
          heading: "foo",
          collection: "fields",
          properties: fieldPropertyDefinitions
        }
      };
      const p = new Pagection(pageData);

      assert.equal(p.hasCollections, true);
    });

    it("hasCollections should return false if ownCollections is absent", () => {
      delete pageData.collectionsDefinitions;
      const p = new Pagection(pageData);

      assert.equal(p.hasCollections, false);
    });

    // relationshipGroups isn't assigned anywhere in Pagection file 166-167 string
    it("notSection should return true if parent doesn't have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'test',
        addChild: () => ''
      }
      const p = new Pagection(pageData);

      assert.equal(p.notSection, true);
    });

    it("notSection should return true if parent does have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => ''
      }
      const p = new Pagection(pageData);

      assert.equal(p.notSection, false);
    });

    it("nestLevel should return 1 if parent does have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'test',
        addChild: () => ''
      }
      const p = new Pagection(pageData);

      assert.equal(p.nestLevel, 1);
    });

    it("nestLevel should return 3 if parent does have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => '',
        nestLevel: 2
      }
      const p = new Pagection(pageData);

      assert.equal(p.nestLevel, 3);
    });

    it("nextNestLevel should return 2 if parent doesn't have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'test',
        addChild: () => '',
        nestLevel: 2
      }
      const p = new Pagection(pageData);

      assert.equal(p.nextNestLevel, 2);
    });

    it("nextNestLevel should return 4 if parent does have match with childrenStyles", () => {
      pageData.childrenStyle = 'section';
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => '',
        nestLevel: 2
      };
      const p = new Pagection(pageData);

      assert.equal(p.nextNestLevel, 4);
    });

    it("nextNextNestLevel should return 5 if parent doesn't have match with childrenStyles", () => {
      const p = new Pagection(pageData);

      assert.equal(p.nextNextNestLevel, 5);
    });

    it("nestLevelMd should return ### if parent doesn't have match with childrenStyles", () => {
      const p = new Pagection(pageData);

      assert.equal(p.nestLevelMd, '###');
    });

    it("nextNestLevelMd should return #### if parent doesn't have match with childrenStyles", () => {
      const p = new Pagection(pageData);

      assert.equal(p.nextNestLevelMd, '####');
    });

    it("parentTitle should return parent title if parent doesn't have match with childrenStyles", () => {
      pageData.parent.parentTitle = 'parentTitle';
      const p = new Pagection(pageData);

      assert.equal(p.parentTitle, pageData.parent.parentTitle);
    });

    it("parentTitle should return title if notSection field does have true", () => {
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => '',
        nestLevel: 2,
        notSection: true,
        title: 'title'
      };
      const p = new Pagection(pageData);

      assert.equal(p.parentTitle, pageData.parent.title);
    });

    it("parentTitle should return undefined if parent isn't defined", () => {
      delete pageData.parent;
      const p = new Pagection(pageData);

      assert.equal(p.parentTitle, undefined);
    });

    it("parentSlug should return undefined if parent isn't defined", () => {
      const p = new Pagection(pageData);

      assert.equal(p.parentSlug, undefined);
    });

    it("parentSlug should return slug if parent does have notSection - true", () => {
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => '',
        nestLevel: 2,
        notSection: true,
        slug: 'slug'
      };
      const p = new Pagection(pageData);

      assert.equal(p.parentSlug, 'slug');
    });

    it("parentSlug should return parentSlug if parent does have notSection - false", () => {
      pageData.parent = {
        childrenStyle: 'section',
        addChild: () => '',
        nestLevel: 2,
        notSection: false,
        parentSlug: 'parentSlug'
      };
      const p = new Pagection(pageData);

      assert.equal(p.parentSlug, 'parentSlug');
    });

    it("hasSections should return false if sections is absent", () => {
      pageData.childrenStyle = 'confnotes';
      const p = new Pagection(pageData);

      assert.equal(p.hasSections, false);
    });
  })


  describe(".addChild", () => {
    it("should fail if child not a Pagection", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "section"
      });

      testArray.forEach(i => {
        assert.throws(
          () => {
            p.addChild(i);
          },
          Error,
          errorMessages.childNotPagection
        );
      });
    });
    it("should fail if children style not set for parent", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel
      });

      assert.throws(
        () => {
          new Pagection({
            title: "field title",
            slug: "field slug",
            model: tableModel.fields[0],
            childrenStyle: "section",
            parent: p
          });
        },
        Error,
        errorMessages.pagectionCantHaveChildren
      );
    });
    it("should add to sections when style=section", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "section"
      });

      const f = new Pagection({
        title: "field title",
        slug: "field-slug",
        model: tableModel.fields[0],
        childrenStyle: "section",
        parent: p
      });

      assert.deepEqual(f.parent, p);
      assert.isArray(p.sections);
      assert.lengthOf(p.sections, 1);
      assert.deepEqual(p.sections[0], f);
    });
    it("should add to linkList when style=linkList", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "linkList"
      });

      const f = new Pagection({
        title: "field title",
        slug: "field-slug",
        model: tableModel.fields[0],
        childrenStyle: "section",
        parent: p
      });

      assert.deepEqual(f.parent, p);
      assert.isArray(p.linkList);
      assert.lengthOf(p.linkList, 1);
      assert.equal(p.linkList[0].slug, f.slug);
      assert.equal(p.linkList[0].title, f.title);
      assert.deepEqual(_.keys(p.linkList[0]), ["title", "slug"]);
    });
    it("should add to linkTable when style=linkTable and set slug to correct property", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "linkTable",
        childrenPropertiesDefinitions: fieldPropertyDefinitions.filter(
          def => def.showInLinkTable
        ),
        tableLinkProperty: "fieldName"
      });

      const f = new Pagection({
        title: "field title",
        slug: "field-slug",
        model: tableModel.fields[0],
        propertiesDefinitions: fieldPropertyDefinitions,
        parent: p
      });

      assert.deepEqual(f.parent, p);
      assert.instanceOf(p.linkTable, op.OwnCollection);
      assert.lengthOf(p.linkTable.rows, 1);
      assert.instanceOf(p.linkTable.rows[0], op.OwnProperties);
      p.linkTable.rows.forEach(row => {
        row.properties.forEach(prop => {
          const childProp = f.properties.getPropertyByName(prop.name);
          assert.isObject(childProp);
          assert.equal(prop.value, childProp.value);
        });
      });
    });
    it("should fail if link property is unavailable and style=linkTable", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "linkTable",
        childrenPropertiesDefinitions: fieldPropertyDefinitions.filter(
          def => def.showInLinkTable
        ),
        tableLinkProperty: "foo"
      });

      assert.throws(
        () => {
          new Pagection({
            title: "field title",
            slug: "field-slug",
            model: tableModel.fields[0],
            propertiesDefinitions: fieldPropertyDefinitions,
            parent: p
          });
        },
        Error,
        errorMessages.pagectionHasNoProperty
      );
    });
    it("shouldn't add to sections when style=section", () => {
      const p = new Pagection({
        title: "table title",
        slug: "table-slug",
        model: tableModel,
        childrenStyle: "confnotes"
      });

      const f = new Pagection({
        title: "field title",
        slug: "field-slug",
        model: tableModel.fields[0],
        childrenStyle: "section",
        parent: p
      });

      assert.deepEqual(f.parent, p);
      assert.equal(p.sections, undefined);
    });
  });
});
