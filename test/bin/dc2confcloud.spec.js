const chai = require("chai");
const spies = require('chai-spies');
const mock = require('mock-require')
const sinon = require('sinon')
const fs = require("fs-extra");

const exitOverrideSpy = sinon.spy();
const nameSpy = sinon.spy();
const optionSpy = sinon.spy(() => ({
  option: optionSpy
}));
const parseSpy = sinon.spy();

const { assert } = chai;
chai.use(spies);

const CommandObjectReturned = {
  name: nameSpy,
  exitOverride: exitOverrideSpy,
  option: optionSpy,
  parse: parseSpy
};
function commandFunc() {
  return CommandObjectReturned
};
const MockCommander = {
  Command: commandFunc
};
mock('commander', MockCommander);
mock('require', {
  main: module
});
mock("../../src/cli/dc2cc", () => Promise.resolve({}));
const dc2confcloud = require("../../bin/dc2confcloud");

describe("dc2confcloud", () => {
  beforeEach(() => {
    chai.spy.on(console, 'log', () => '');
  })

  afterEach(() => {
    chai.spy.restore(console, 'log');
    chai.spy.restore(fs, 'readJSONSync');
    chai.spy.restore(fs, 'existsSync');
  })


  it("dc2confcloud should call 'exitOverride' if 'exitCallback' is passed as function", async () => {
    chai.spy.on(fs, 'readJSONSync', () => 'testreadFileSyncdata');
    // ToDo: refactor this
    //    console.log('existsSynfunction', fs.existsSync)
    chai.spy.on(fs, 'existsSync', () => true);
    CommandObjectReturned.user = 'user';
    CommandObjectReturned.token = 'token';
    CommandObjectReturned.config = 'config';

    await dc2confcloud({}, {}, () => ({}));

    sinon.assert.called(exitOverrideSpy);
  });

  it("dc2confcloud should throw error if 'user' field in program is absent", async () => {
    let f = () => { };
    CommandObjectReturned.user = '';
    try {
      await dc2confcloud({}, {}, () => ({}));
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "user name is required");
    }
  });

  it("dc2confcloud should throw error if 'token' field in program is absent", async () => {
    let f = () => { };
    CommandObjectReturned.user = 'user';
    CommandObjectReturned.token = '';
    try {
      await dc2confcloud({}, {}, () => ({}));
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "access token is required");
    }
  });

  it("dc2confcloud should throw error if 'config' field in program is absent", async () => {
    let f = () => { };
    CommandObjectReturned.user = 'user';
    CommandObjectReturned.token = 'token';
    CommandObjectReturned.config = '';

    try {
      await dc2confcloud({}, {}, () => ({}));
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        "path to configuration json is required");
    }
  });

  it("dc2confcloud should throw error if file in program.config doesn't exist", async () => {
    let f = () => { };
    chai.spy.on(fs, 'existsSync', () => false);
    CommandObjectReturned.user = 'user';
    CommandObjectReturned.token = 'token';
    CommandObjectReturned.config = 'config';

    try {
      await dc2confcloud({}, {}, () => ({}));
    } catch (e) {
      f = () => { throw e };
    } finally {
      assert.throws(f, Error,
        `File '${CommandObjectReturned.config}' not found`);
    }
  });
})
