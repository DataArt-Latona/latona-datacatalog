/* eslint-disable no-new */
const chai = require("chai");
const spies = require('chai-spies');
const axios = require("axios");
const Qs = require("qs");
const _ = require("lodash");

const { assert } = chai;
chai.use(spies);
const ConfCloudClient = require("../../../src/cli/confCloudClient");


describe("confCloudClient", () => {
  const url = 'http://test.com.us';
  const key = 'testKey';
  const user = 'testUser';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ik';

  beforeEach(() => {
    chai.spy.on(console, 'log', () => 'dc2confcloud');
  })

  afterEach(() => {
    chai.spy.restore(console, 'log');
    chai.spy.restore(axios, 'request');
  })

  it("constructor should throw error if incoming baseUrl is empty", () => {
    assert.throws(
      () => {
        new ConfCloudClient();
      },
      Error,
      "baseUrl' should be non-empty string"
    );
  });

  it("constructor should throw error if incoming spaceKey is empty", () => {
    assert.throws(
      () => {
        new ConfCloudClient('http://test.com.us');
      },
      Error,
      "spaceKey' should be non-empty string"
    );
  });

  it("constructor should throw error if incoming user is empty", () => {
    assert.throws(
      () => {
        new ConfCloudClient('http://test.com.us', 'testKey');
      },
      Error,
      "user' should be non-empty string"
    );
  });

  it("constructor should throw error if incoming token is empty", () => {
    assert.throws(
      () => {
        new ConfCloudClient('http://test.com.us', 'testKey', 'testUser');
      },
      Error,
      "token' should be non-empty string"
    );
  });

  it("constructor should called without error", () => {
    assert.doesNotThrow(
      () => {
        new ConfCloudClient('http://test.com.us', 'testKey', 'testUser', 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ik')
      },
      {}
    );
  });

  it("auth should return correct auth object", () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token)

    assert.deepEqual(confCloudClient.auth, { username: user, password: token });
  });

  it("makeRequest make request and return expected response", async () => {
    const subUrl = '/product';
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const expectedResponse = {
      testDate: 'newdatatest',
      request: {
        path: 'testPath'
      }
    };
    const method = 'get';
    const data = 'testdata';
    const params = { page: 1 };
    const expectedReq = {
      url: `https://${url}/wiki/rest/api${subUrl}`,
      auth: {
        username: user,
        password: token
      },
      method,
      params,
      data,
      validateStatus: () => {
        return true;
      },
      paramsSerializer: ps => {
        return Qs.stringify(ps);
      }
    };
    const spyStringify = chai.spy.on(Qs, 'stringify', () => {
      return 'data';
    });
    let incomingRequest;
    const spyRequest = chai.spy.on(axios, 'request', (request) => {
      incomingRequest = request;
      request.paramsSerializer();
      request.validateStatus();
      return Promise.resolve(expectedResponse);
    });

    const response = await confCloudClient.makeRequest(
      method,
      subUrl,
      params,
      data
    )
    assert.deepEqual(response, expectedResponse);
    chai.expect(spyRequest).to.have.been.called();
    chai.expect(spyStringify).to.have.been.called();
    assert.equal(JSON.stringify(incomingRequest), JSON.stringify(expectedReq));
  });

  it("getContentByTitle should throw error if title is empty", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    let f = () => { };

    try {
      await confCloudClient.getContentByTitle();
    } catch (error) {
      f = () => {
        throw error;
      };
    } finally {
      assert.throws(f, Error, "'title' should be non-empty string");
    }
  });

  it("getContentByTitle should pass correct arguments into makeRequest", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const title = 'testTitle';
    const expectedResponse = {
      testDate: 'newdatatest',
      request: {
        path: 'testPath'
      }
    };
    const expectedMakeRequestArgs = ['get',
      '/content',
      { spaceKey: 'testKey', expand: 'version', title: 'testTitle' },
      undefined,
      false];

    let incomingArguments;

    function interceptArguments(...args) {
      incomingArguments = [].slice.call(args);
      return Promise.resolve(expectedResponse);
    }

    chai.spy.on(confCloudClient, 'makeRequest', interceptArguments);

    const response = await confCloudClient.getContentByTitle(title);

    assert.deepEqual(response, expectedResponse);
    assert.deepEqual(incomingArguments, expectedMakeRequestArgs);
  });

  it("createOrUpdateContentByTitle should throw error if incoming title field is empty", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);

    try {
      await confCloudClient.createOrUpdateContentByTitle()
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql("'title' should be non-empty string")
    }
  });

  it("createOrUpdateContentByTitle should throw error if incoming ancestorId field is empty", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);

    try {
      await confCloudClient.createOrUpdateContentByTitle('testTitle')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql("'ancestorId' should be integer")
    }
  });

  it("createOrUpdateContentByTitle should throw error if incoming body field is empty", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);

    try {
      await confCloudClient.createOrUpdateContentByTitle('testTitle', 123)
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql("'body' should be non-empty string")
    }
  });

  it("createOrUpdateContentByTitle should throw error if response of getContentByTitle contains all fields and status not equal 200", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 400;
    const contentByTitleResponse = {
      status,
      data: {
        message: 'testData'
      }
    };
    const title = 'testTitle';
    chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    try {
      await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql(`Failed to get content for title "${title}" - server returned error` +
        `: ${contentByTitleResponse.status} - ${contentByTitleResponse.data.message}`)
    }
  });

  it("createOrUpdateContentByTitle should throw error if response of getContentByTitle contains only status not equal 200 ", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 400;
    const contentByTitleResponse = {
      status
    };
    const title = 'testTitle';
    chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    try {
      await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql(`Failed to get content for title "${title}" - empty response,` +
        ` status code ${contentByTitleResponse.status}`)
    }
  });

  it("createOrUpdateContentByTitle should throw error if getContentByTitle throw error", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const errorMessage = 'getContentByTitle error';
    const title = 'testTitle';
    chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      throw new Error(errorMessage)
    });
    try {
      await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql(errorMessage)
    }
  });

  it(`createOrUpdateContentByTitle should throw error if response of getContentByTitle contains success status, empty data results and makeRequest returns error with message`, async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 200;
    const makeRequestResponseStatus = 400;
    const makeRequestResponseMessage = 'Make request error message';
    const contentByTitleResponse = {
      status,
      data: {
        results: []
      }
    };
    const makeRequestResponse = {
      status: makeRequestResponseStatus,
      data: {
        message: makeRequestResponseMessage
      }
    };
    const title = 'testTitle';
    chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    chai.spy.on(confCloudClient, 'makeRequest', () => {
      return Promise.resolve(makeRequestResponse);
    });
    try {
      await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql(`Failed to create or update page for title "${title}" - ` +
        `server returned error: ${makeRequestResponse.status} - ${makeRequestResponse.data.message}`)
    }
  });

  it("createOrUpdateContentByTitle should throw error if response of getContentByTitle contains success status, empty data results and makeRequest returns error without message ", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 200;
    const makeRequestResponseStatus = 400;
    const contentByTitleResponse = {
      status,
      data: {
        results: []
      }
    };
    const makeRequestResponse = {
      status: makeRequestResponseStatus
    };
    const title = 'testTitle';
    chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    chai.spy.on(confCloudClient, 'makeRequest', () => {
      return Promise.resolve(makeRequestResponse);
    });
    try {
      await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody')
    } catch (e) {
      chai.expect(e).to.be.instanceOf(Error)
      chai.expect(e.message).to.eql(`Failed to create or update page for title "${title}" - empty ` +
        `response, status code ${makeRequestResponse.status}`)
    }
  });

  it("createOrUpdateContentByTitle should return page info if getContentByTitle retrieve no empty data and noUpdate is true", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 200;
    const mockPageInfo = {
      id: 1215
    };
    const contentByTitleResponse = {
      status,
      data: {
        results: [mockPageInfo]
      }
    };
    const title = 'testTitle';
    const spyGetContentByTitle = chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    const res = await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody', true);

    chai.expect(spyGetContentByTitle).to.have.been.called();
    assert.deepEqual(res, { title, id: mockPageInfo.id });
  });

  it("createOrUpdateContentByTitle should return page info if getContentByTitle retrieve no empty data and noUpdate is false", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const status = 200;
    const makeRequestResponseStatus = 200;
    const mockPageInfo = {
      id: 1215,
      version: {
        number: 1
      }
    };
    const contentByTitleResponse = {
      status,
      data: {
        results: [mockPageInfo]
      }
    };
    const makeRequestResponse = {
      status: makeRequestResponseStatus,
      data: {
        id: mockPageInfo.id,
        results: [mockPageInfo]
      }
    };
    const title = 'testTitle';
    const spyGetContentByTitle = chai.spy.on(confCloudClient, 'getContentByTitle', () => {
      return Promise.resolve(contentByTitleResponse);
    });
    const spyMakeRequest = chai.spy.on(confCloudClient, 'makeRequest', () => {
      return Promise.resolve(makeRequestResponse);
    });
    const res = await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody');

    chai.expect(spyGetContentByTitle).to.have.been.called();
    chai.expect(spyMakeRequest).to.have.been.called();
    assert.deepEqual(res, { title, id: mockPageInfo.id });
  });

  it("createOrUpdateContentByTitle should return page info via search endpoint if getContentByTitle retrieve no empty data and noUpdate is false", async () => {
    const confCloudClient = new ConfCloudClient(url, key, user, token);
    const makeRequestResponseStatus = 200;
    const mockPageInfo = {
      id: 1215,
      version: {
        number: 1
      }
    };

    const makeRequestResponse = {
      status: makeRequestResponseStatus,
      data: {
        id: mockPageInfo.id,
        results: [mockPageInfo]
      },
      request: {
        path: 'testPath'
      }
    };
    const title = 'testTitle';

    const spyMakeRequest = chai.spy.on(axios, 'request', (req) => {
      console.debug('endpoint.includes', req.url)
      console.debug('endpoint.includes', req.url.includes('search'))
      if (!req.url.includes('search')) {
        console.debug('retusnemptyarray')
        const makeRequestResponseCopy = _.cloneDeep(makeRequestResponse);
        delete makeRequestResponseCopy.data.results;
        return Promise.resolve(makeRequestResponseCopy);
      }
      console.log('retusnemptyarray2222')
      return Promise.resolve(makeRequestResponse);
    });
    const res = await confCloudClient.createOrUpdateContentByTitle(title, 123, 'testBody');

    chai.expect(spyMakeRequest).to.have.been.called();
    assert.deepEqual(res, { title, id: mockPageInfo.id });
  });
});

