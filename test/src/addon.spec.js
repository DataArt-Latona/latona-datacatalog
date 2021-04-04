const chai = require("chai");
const spies = require('chai-spies');
const fsExt = require("fs-extra");
const sinon = require('sinon');
const pb = require("../../src/addonInternals/pagesBuilder");
const { create } = require('../../src/addon');

const { assert } = chai;
chai.use(spies);

describe("addon", () => {
  const opt = {
    paths: {
      customContentPath: 'customContentPath'
    },
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
  const addRenderTaskMock = sinon.fake.returns({});

  const addPreprocessingTaskMock = sinon.fake.returns({ addRenderTask: addRenderTaskMock });
  const addonObj = {
    addPreprocessingTask: addPreprocessingTaskMock,
    addRenderTask: addRenderTaskMock
  };
  const addonCreateCbMock = sinon.fake.returns(addonObj);

  beforeEach(() => {
    chai.spy.restore();
    addRenderTaskMock.resetHistory();
    addPreprocessingTaskMock.resetHistory();
  });

  it("create should throw error if 'addonCreateCb' incoming parameter is not function", () => {
    assert.throws(
      () => {
        create()
      },
      Error,
      `"addonCreateCb" is expected to be a function`
    );
  });

  it("addPreprocessingTask should be called", () => {
    create(opt, addonCreateCbMock);
    assert.equal(addPreprocessingTaskMock.callCount, 1);
  });

  it("addRenderTask should be called", () => {
    create(opt, addonCreateCbMock);
    assert.equal(addRenderTaskMock.callCount, 2);
  });

  it("addPreprocessingTask should throw error", () => {
    const message = 'Error in buildPages';
    const buildPagesSpy = chai.spy.on(pb, 'buildPages', () => { throw new Error(message) });
    const errorMessage = `Error: ${message}`;
    const proj = {
      getResolvedProjectPath: () => '../output'
    };
    create(opt, addonCreateCbMock);

    assert.throws(
      () => {
        addPreprocessingTaskMock.getCall(0).firstArg(proj)
      },
      Error,
      `Failed to build page tree: ${errorMessage}`
    );
    chai.expect(buildPagesSpy).to.have.been.called();
  });

  it("itemsBuilder field function should be corrected finished in addRenderTask function", () => {
    const pagesMock = [{
      title: 'testTitle',
      slug: 'testSlug'
    }];
    const proj = {
      getResolvedProjectPath: () => '../output'
    };

    chai.spy.restore(pb, 'buildPages');
    const buildPagesSpy = chai.spy.on(pb, 'buildPages', () => pagesMock);

    create(opt, addonCreateCbMock);

    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    const items = addRenderTaskMock.getCall(0).firstArg.itemsBuilder(proj);

    chai.expect(buildPagesSpy).to.have.been.called(1);
    assert.deepEqual(items[0].model.pages, pagesMock);
  });

  it("formatTemplates should be called in addRenderTask function", () => {
    const pagesMock = [{
      title: 'testTitle',
      slug: 'testSlug',
      pageType: 'page'
    }];
    const projPath = './output';
    const proj = {
      getResolvedProjectPath: () => projPath
    };

    const buildPagesSpy = chai.spy.on(pb, 'buildPages', () => pagesMock);
    const existsSyncSpy = chai.spy.on(fsExt, 'existsSync', () => true);

    create(opt, addonCreateCbMock);
    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    const items = addRenderTaskMock.getCall(1).firstArg.itemsBuilder(proj);

    chai.expect(existsSyncSpy).to.have.been.called(4);
    chai.expect(buildPagesSpy).to.have.been.called(0);
    assert.deepEqual(items[0].model, pagesMock[0])
    assert.deepEqual(items[0].fileName, `${projPath}/${pagesMock[0].slug}.md`)
  });

  it("addRenderTask should be called 3 times if renderFormat is matched with any pagesBuilder formats ", () => {
    const pagesMock = [{
      title: 'testTitle',
      slug: 'testSlug',
      pageType: 'confnotes'
    },
    {
      title: 'testTitle1',
      slug: 'testSlug1',
      pageType: 'page'
    }];
    const projPath = './output';
    const proj = {
      getResolvedProjectPath: () => projPath
    };
    opt.renderFormat = 'conf';

    chai.spy.restore(fsExt, 'existsSync');
    chai.spy.on(pb, 'buildPages', () => pagesMock);
    chai.spy.on(fsExt, 'existsSync', () => true);

    create(opt, addonCreateCbMock);

    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    addRenderTaskMock.getCall(1).firstArg.itemsBuilder();
    const items = addRenderTaskMock.getCall(2).firstArg.itemsBuilder();

    assert.equal(addRenderTaskMock.callCount, 3);
    assert.deepEqual(items[0].model, pagesMock[0])
    assert.deepEqual(items[0].fileName, `${projPath}/${pagesMock[0].slug}.confstorage`)
  });



  it("addRenderTask should be called 2 times and itemsBuilder in the second time should return none items ", () => {
    const pagesMock = [];
    const projPath = './output';
    const proj = {
      getResolvedProjectPath: () => projPath
    };
    opt.renderFormat = 'md';

    chai.spy.restore(fsExt, 'existsSync');
    chai.spy.on(pb, 'buildPages', () => pagesMock);
    chai.spy.on(fsExt, 'existsSync', (pathinput) => true);

    create(opt, addonCreateCbMock);
    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    addRenderTaskMock.getCall(0).firstArg.itemsBuilder();

    addRenderTaskMock.getCall(1).firstArg.itemsBuilder();

    assert.equal(addRenderTaskMock.callCount, 2);
  });

  it("pageTree should return cached value if pagesCache exists", () => {
    const pagesMock = [{
      title: 'testTitle',
      slug: 'testSlug',
      pageType: 'confnotes'
    }];
    const projPath = './output';
    const proj = {
      getResolvedProjectPath: () => projPath
    };

    chai.spy.restore(pb, 'buildPages');
    const buildPagesSpy = chai.spy.on(pb, 'buildPages', () => pagesMock);

    create(opt, addonCreateCbMock);

    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    addPreprocessingTaskMock.getCall(0).firstArg(proj);
    addRenderTaskMock.getCall(0).firstArg.itemsBuilder(proj);
    addRenderTaskMock.getCall(1).firstArg.itemsBuilder(proj);

    assert.equal(addPreprocessingTaskMock.callCount, 1);
    assert.equal(addRenderTaskMock.callCount, 2);
    chai.expect(buildPagesSpy).to.have.been.called();

    chai.spy.restore(pb, 'buildPages');
  });
});
