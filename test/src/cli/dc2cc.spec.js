const chai = require("chai");
const spies = require('chai-spies');
const _ = require('lodash');
const mock = require('mock-require')
const sinon = require('sinon')
const fs = require("fs-extra");

const plimitSpy = sinon.spy((func) => func());
const createOrUpdateContentByTitleSpy = sinon.spy();

const { assert } = chai;
chai.use(spies);

mock('p-limit', () => plimitSpy);
function MockedConfCloudClient() {
  return { createOrUpdateContentByTitle: createOrUpdateContentByTitleSpy }
};
mock('../../../src/cli/confCloudClient', MockedConfCloudClient);
mock.stop('../../../src/cli/dc2cc')
const dc2cc = require("../../../src/cli/dc2cc");

describe("dc2cc", () => {
  const config = {
    confluence: {
      baseUrl: 'https:\\test.com',
      spaceKey: 'testKey'
    },
    contentFolder: 'src',
    pageTree: 'test\\mocks',
    parents: [{}],
    notesSuffix: 'notesSuffix'
  };

  beforeEach(() => {
    chai.spy.on(console, 'log', () => (''));
  });

  afterEach(() => {
    chai.spy.restore(console, 'log');
  });

  it("dc2cc should throw error if confluence is not object", async () => {
    let f = () => { };

    try {
      await dc2cc({ confluence: '' });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'confluence' is expected to be an object");
    }
  });

  it("dc2cc should throw error if confluence baseUrl field is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({ confluence: { baseUrl: '' } });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'confluence.baseUrl' is expected to be non-empty string");
    }
  });

  it("dc2cc should throw error if confluence spaceKey feild is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({ confluence: { baseUrl: 'baseUrl', spaceKey: '' } });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'confluence.spaceKey' is expected to be non-empty string");
    }
  });

  it("dc2cc should throw error if contentFolder is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({
        confluence: {
          baseUrl: 'baseUrl',
          spaceKey: 'spaceKey'
        },
        contentFolder: ''
      });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'contentFolder' is expected to be non-empty string");
    }
  });

  it("dc2cc should throw error if pageTree is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({
        confluence: {
          baseUrl: 'baseUrl',
          spaceKey: 'spaceKey'
        },
        contentFolder: 'contentFolder',
        pageTree: ''
      });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'pageTree' is expected to be non-empty string");
    }
  });

  it("dc2cc should throw error if parents is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({
        confluence: {
          baseUrl: 'baseUrl',
          spaceKey: 'spaceKey'
        },
        contentFolder: 'contentFolder',
        pageTree: 'pageTree',
        parents: []
      });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'parents' is expected to be non-empty array");
    }
  });

  it("dc2cc should throw error if notesSuffix is empty string", async () => {
    let f = () => { };
    try {
      await dc2cc({
        confluence: {
          baseUrl: 'baseUrl',
          spaceKey: 'spaceKey'
        },
        contentFolder: 'contentFolder',
        pageTree: 'pageTree',
        parents: [{}],
        notesSuffix: ''
      });
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "'notesSuffix' is expected to be string or empty");
    }
  });

  it("dc2cc should throw error if resolvedContentFolder doesn't exist", async () => {
    let f = () => { };
    const args = {
      config: "testtemp"
    };
    const tempConfid = _.cloneDeep(config);
    tempConfid.contentFolder = 'testtemp'
    const resolvedContentFolder = `${process.cwd()}\\${args.config}`;
    try {
      await dc2cc(tempConfid, args);
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        `Path "${resolvedContentFolder}" doesn't exist`);
    }
  });

  it("dc2cc should throw error if resolvedContentFolder doesn't exist", async () => {
    let f = () => { };
    const args = {
      config: "temp"
    };
    const resolvedContentFolder = `${process.cwd()}\\${config.contentFolder}`;
    try {
      await dc2cc(config, args);
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        `File "${resolvedContentFolder}" doesn't exist`);
    }
  });

  describe("allPages process cases", () => {
    const tempConfig = _.cloneDeep(config);
    tempConfig.contentFolder = "test\\mocks\\addon.spec"
    tempConfig.pageTree = "project.json";
    tempConfig.parents = [{ slug: 'testSlug', confPageId: 12 }];
    const mockPages = [{
      parentSlug: 'parentSlug',
      title: 'testTitle',
      slug: 'testSlug'
    },
    {
      parentSlug: 'testSlug',
      title: 'newtestTitle',
      slug: 'newtestSlug'
    }];
    const mockPromiseAllResponse = [{
      id: 1,
      parentSlug: 'parentSlug',
      title: 'testTitle',
      slug: 'testSlug'
    }]
    const args = {
      config: "temp",
      user: 'user',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ik'
    };

    beforeEach(() => {
      chai.spy.on(fs, 'readJson', () => Promise.resolve(mockPages));
    })

    afterEach(() => {
      chai.spy.restore(Promise);
      chai.spy.restore(fs);
    });


    it("dc2cc should not create or update root pages and capture (title,id) tuples", async () => {

      const spyPromiseAll = chai.spy.on(Promise, 'all', () => Promise.resolve(mockPromiseAllResponse));

      await dc2cc(tempConfig, args);

      chai.expect(spyPromiseAll).to.not.have.been.called();
      sinon.assert.notCalled(plimitSpy);
    });

    it("dc2cc should check if root pages have no specified parents", async () => {
      // dc2cc line 86 
      // ancestorId: p.parentSlug
      // ? undefined
      // : parents.find(anc => anc.slug === p.slug).confPageId,
      // What happen if anc.slug doesn't match p.slug ?
      mockPages[0].parentSlug = '';
      const currentTestConfig = _.cloneDeep(tempConfig);
      currentTestConfig.parents = [{ slug: 'testSlug', confPageId: 0 }];
      const spyPromiseAll = chai.spy.on(Promise, 'all', () => Promise.resolve(mockPromiseAllResponse));

      await dc2cc(currentTestConfig, args);

      chai.expect(spyPromiseAll).to.not.have.been.called();
      sinon.assert.notCalled(plimitSpy);
    });

    it("dc2cc should throw error if parent item and page of allpages has no same slug", async () => {
      // line 81 
      // code: parents.find(anc => anc.slug === p.slug).confPageId
      mockPages[0].parentSlug = '';
      const currentTestConfig = _.cloneDeep(tempConfig);
      currentTestConfig.parents = [{ slug: 'unknownSlug', confPageId: 0 }];
      chai.spy.on(Promise, 'all', () => Promise.resolve(mockPromiseAllResponse));
      let f = () => { };

      try {
        await dc2cc(currentTestConfig, args);
      } catch (e) {
        f = () => { throw e }
      } finally {
        chai.expect(f).to.not.throw();
      }
    });

    it("dc2cc should create relationship between child and ancestor (line 156-157)", async () => {
      // What happen if page no found in line 153?
      // line 154  page.processed = true;
      mockPages[0].parentSlug = '';
      mockPages[0].slug = 'testSlug';
      const currentTestConfig = _.cloneDeep(tempConfig);
      currentTestConfig.parents = [{ slug: 'testSlug', confPageId: 1 }];

      const spyPromiseAll = chai.spy.on(Promise, 'all', () => Promise.resolve(mockPromiseAllResponse));
      await dc2cc(currentTestConfig, args);
      chai.expect(spyPromiseAll).to.have.been.called();
      sinon.assert.called(plimitSpy);
    });

    it("dc2cc should handle error if Promise.all return rejected promise", async () => {
      // should dc2cc be updated if promise all returns error?

      const message = 'Someone promise is failed'
      const spyPromiseAll = chai.spy.on(Promise, 'all', () => Promise.reject(new Error(message)));

      try {
        await await dc2cc(tempConfig, args);
      } catch (e) {
        chai.expect(spyPromiseAll).to.have.been.called();
        chai.expect(e).to.be.instanceOf(Error)
        chai.expect(e.message).to.eql(message)
      }
    });

    it("dc2cc should throw error if page of allPages doesn't have the same title with Promise.all response", async () => {

      const mockPromiseAllRes = [{
        id: 1,
        parentSlug: 'parentSlug',
        title: 'unknownTitle',
        slug: 'testSlug'
      }]

      const spyPromiseAll = chai.spy.on(Promise, 'all', () => Promise.resolve(mockPromiseAllRes));

      try {
        await await dc2cc(tempConfig, args);
      } catch (e) {
        chai.expect(spyPromiseAll).to.have.been.called();
        chai.expect(e).to.be.instanceOf(Error)
        chai.expect(e.message).to.eql('Cannot set property \'processed\' of undefined')
      }

    });
  });
});

