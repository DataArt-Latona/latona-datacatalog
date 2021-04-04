const chai = require("chai");
const _ = require("lodash");
const fse = require("fs-extra");
const markdown = require("markdown-it");

const model = fse.readJSONSync("./test/mocks/addon.spec/model.json");
const spies = require('chai-spies');
const sinon = require("sinon");
const { buildPages } = require("../../../src/addonInternals/pagesBuilder");
const ob = require("../../../src/addonInternals/optionsBuilder");

chai.use(spies);
const { assert } = chai;

describe("buildPages", () => {
  let opt;
  let spyexistsSync;

  before(() => {
    spyexistsSync = chai.spy.on(fse, 'existsSync', () => {
      return true;
    });
    chai.spy.on(fse, 'readFileSync', () => {
      return "testdata";
    });
  })
  beforeEach(() => {
    opt = ob.buildOptions({});
  });

  it("buildPages.WIP should return correct amount of pages", () => {
    const pages = buildPages(model, opt, "");

    assert.equal(pages.length, 40);
  });

  it("buildPages should throw error about empyt collection", () => {
    const emptyModel = {
      "tables": null,
      "sourceDataSets": [],
      "collections": {
        "businessProcesses": null,
        "applications": null,
        "relationshipTypes": null,
        "relationships": null
      }
    };

    assert.throws(
      () => {
        buildPages(emptyModel, opt, "");
      },
      Error,
      `Model doesn't have appropriate collection`
    );
  });

  it("buildPages should return right number of pages (except conf) with allCatalogs links", () => {
    const tempOpt = _.cloneDeep(opt);
    tempOpt.renderFormat = 'unknown';
    tempOpt.catalogs = { dataCatalog: opt.catalogs.dataCatalog }
    const pages = buildPages(model, tempOpt, "");
    let expectedLinksAmout = 0;
    pages.forEach(item => {
      if (item.allCatalogs) {
        expectedLinksAmout += 1
      };
    });

    assert.equal(pages.length / 2, expectedLinksAmout);
  });

  it("buildPages pages should have appropriate number of relationship group elements", () => {
    let amountOfRelTypesPerPage = 0;
    let tableNameRefCounts = 0;
    const tempOpt = _.cloneDeep(opt);
    tempOpt.catalogs = { dataCatalog: tempOpt.catalogs.dataCatalog }
    const pages = buildPages(model, tempOpt, "");
    const pagesWithRelTypes = pages.filter(page =>
      (page.confNotesTitle && page.confNotesTitle.includes('Table')));
    const expectedAllRelTypesCorrect = pagesWithRelTypes.every(pageItem => {
      amountOfRelTypesPerPage = 0;
      if (pageItem.relationshipGroups && pageItem.relationshipGroups.length > 0) {
        const tableName = pageItem.confNotesTitle.split('.')[2].split(']')[0].split('[')[1];
        pageItem.relationshipGroups.forEach(pagesLinksObj => {
          amountOfRelTypesPerPage += pagesLinksObj.pages.length;
        });
        tableNameRefCounts = model.collections.relationships.reduce((acc, rel) => {
          const keyWords = ['dbo', 'raw'];
          if (_.some(keyWords, (el) => _.includes(rel.source, el))
            && _.some(keyWords, (el) => _.includes(rel.target, el))) {
            if (rel.source.includes(tableName) || rel.target.includes(tableName)) {
              return acc + 1;
            };
          }

          return acc + 0;
        }, 0);
        if (tableNameRefCounts === amountOfRelTypesPerPage) { return true }

        return false;

      };
      return false;
    })

    assert.equal(expectedAllRelTypesCorrect, true);
  });

  it("should fail if no relation type", () => {
    const tempOpt = _.cloneDeep(opt);
    opt.catalogs.dataCatalog.slug = 'qwer';
    const tempModal = _.cloneDeep(model);

    tempModal.collections.relationshipTypes =
      model.collections.relationshipTypes.map(rel =>
        ({ id: undefined, title_forward: rel.title_forward, title_backward: undefined })
      );

    assert.throws(
      () => {
        buildPages(tempModal, tempOpt, "");
      },
      Error,
      'Failed to find relation type app2da-write'
    );

  });

  it("should handle if properties field in sectionBy is empty and send appropriate message", () => {
    const tempOpt = _.cloneDeep(opt);
    tempOpt.catalogs.dataCatalog.sectionBy.first.properties = [];
    tempOpt.catalogs.dataCatalog.sectionBy.second.properties = [];

    assert.throws(
      () => {
        buildPages(model, tempOpt, "");
      },
      Error
    );

  });

  it("should handle if input paramters are absent (e.g. model, options)", () => {
    assert.throws(
      () => {
        buildPages(undefined, undefined, "");
      },
      Error,
      `Model parameter shouldn't be empty`
    );

  });

  it("should handle if sectionBy fields are simple values (e.g. first = 'test')", () => {
    const tempOpt = _.cloneDeep(opt);
    tempOpt.catalogs.dataCatalog.sectionBy.first = 'hello';
    assert.throws(
      () => {
        buildPages(model, tempOpt, "");
      },
      Error,
      `'first' field of sectionBy should be of type 'object'`
    );

  });

  it("pages should be created without Notes pages", () => {
    const tempOpt = _.cloneDeep(opt);
    tempOpt.catalogs = { dataCatalog: opt.catalogs.dataCatalog }
    tempOpt.conf.createNotesPage = false;

    const pages = buildPages(model, tempOpt, "");
    const hasNoteInTitle = pages.some(page => page.title.includes('Note'));

    assert.equal(pages.length, 9);
    assert.equal(hasNoteInTitle, false);
  });

  it("readFileSync shoud be called if 'customContentFolderResolved' is passed ", () => {
    buildPages(model, opt, "./test/output");

    chai.expect(spyexistsSync).to.have.been.called();
  });

  it("md render should be called if 'renderFormat' is unknown ", () => {
    const temptOpt = _.cloneDeep(opt);

    temptOpt.renderFormat = 'unknown'
    sinon.stub(markdown.prototype, 'render').callsFake(() => {
      return 'mock'
    });
    buildPages(model, temptOpt, './test/output');

    sinon.assert.called(markdown.prototype.render);
  });
});
