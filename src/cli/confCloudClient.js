/**
 * REST API client for Confluence Cloud
 * @private
 */
/* eslint-disable no-console */
const chalk = require("chalk");
const axios = require("axios");
const Qs = require("qs");
const validators = require("../util/validators");

const httpMethods = {
  get: "get",
  post: "post",
  put: "put"
};

/**
 * Client class for Confluence REST API. Implements only subset of methods.
 * @class
 * @property {string} baseUrl
 * @property {string} spaceKey
 * @property {string} user
 * @property {string} token
 */
class ConfCloudClient {
  constructor(baseUrl, spaceKey, user, token) {
    if (!validators.validateStringNotEmpty(baseUrl))
      throw new Error("'baseUrl' should be non-empty string");
    if (!validators.validateStringNotEmpty(spaceKey))
      throw new Error("'spaceKey' should be non-empty string");
    if (!validators.validateStringNotEmpty(user))
      throw new Error("'user' should be non-empty string");
    if (!validators.validateStringNotEmpty(token))
      throw new Error("'token' should be non-empty string");

    this.baseUrl = baseUrl;
    this.spaceKey = spaceKey;
    this.user = user;
    this.token = token;
  }

  /**
   * Returns object with Basic authentication credentials
   * @returns {Object}
   */
  get auth() {
    return {
      username: this.user,
      password: this.token
    };
  }

  /**
   * Executes HTTPS request for Confluence Cloud REST API
   * @param {string} method
   * @param {string} url
   * @param {string} params query string params
   * @param {Object} data body data
   * @returns {Object} axios response object
   */
  async makeRequest(method, url, params, data) {
    const req = {
      url: `https://${this.baseUrl}/wiki/rest/api${url}`,
      auth: this.auth,
      method,
      params,
      data,
      // we treat statuses at another place, no need to throw here
      validateStatus: () => {
        return true;
      },
      // proper encoding is of essence for confluence API, axios alone is
      // troublesome here
      paramsSerializer: ps => {
        return Qs.stringify(ps);
      }
    };

    const resp = await axios.request(req);
    console.log(`Confluence request was: ${method} ${resp.request.path}`);
    return resp;
  }

  /**
   * Returns page details (including version info) by page title
   * @param {string} title
   * @returns {Object} axios response object
   */
  async getContentByTitle(title) {
    if (!validators.validateStringNotEmpty(title))
      throw new Error("'title' should be non-empty string");

    return this.makeRequest(httpMethods.get, "/content", {
      spaceKey: this.spaceKey,
      expand: "version",
      title
    });
  }

  /**
   * Lookups page by title and updates it if found. If missing, creates new one.
   * @param {string} title
   * @param {int} ancestorId parent page's id (affects change operations,
   *   no effect on lookup)
   * @param {string} body page body in "storage" format
   * @param {boolean} noUpdate flags if update should be skipped when page
   *   exists (default = false)
   * @returns {Object} object containing page `title` and `id`
   */
  async createOrUpdateContentByTitle(
    title,
    ancestorId,
    body,
    noUpdate = false
  ) {
    if (!validators.validateStringNotEmpty(title))
      throw new Error("'title' should be non-empty string");
    if (!validators.validateInteger(ancestorId))
      throw new Error("'ancestorId' should be integer");
    if (!validators.validateStringNotEmpty(body))
      throw new Error("'body' should be non-empty string");

    try {
      console.log(chalk.cyan(`Requesting content for title "${title}"`));
      const existingContentResp = await this.getContentByTitle(title);

      if (
        existingContentResp.status !== 200 &&
        existingContentResp.data &&
        existingContentResp.data.message
      ) {
        throw new Error(
          `Failed to get content for title "${title}" - server returned error` +
          `: ${existingContentResp.status} - ${existingContentResp.data.message}`
        );
      } else if (
        existingContentResp.status !== 200 ||
        !existingContentResp ||
        !existingContentResp.data ||
        !existingContentResp.data.results
      ) {
        throw new Error(
          `Failed to get content for title "${title}" - empty response,` +
          ` status code ${existingContentResp.status}`
        );
      }

      // update existing page
      let resp;
      if (existingContentResp.data.results.length > 0) {
        const pageInfo = existingContentResp.data.results[0];

        if (noUpdate) {
          console.log(chalk.cyan(`updates blocked for "${title}" - SKIPPED`));
          resp = {
            status: 200,
            data: {
              id: pageInfo.id
            }
          };
        } else {
          console.log(
            chalk.cyan(
              `Updating content for title "${title}" version ${pageInfo.version.number}`
            )
          );

          resp = await this.makeRequest(
            httpMethods.put,
            `/content/${pageInfo.id}`,
            undefined,
            {
              version: {
                number: pageInfo.version.number + 1,
                minorEdit: true
              },
              title,
              type: "page",
              space: { key: this.spaceKey },
              status: "current",
              ancestors: [{ id: ancestorId }],
              body: { storage: { value: body, representation: "storage" } }
            }
          );
        }
      }
      // create new page
      else {
        console.log(chalk.cyan(`Creating new page for title "${title}"`));
        resp = await this.makeRequest(httpMethods.post, "/content", undefined, {
          title,
          type: "page",
          space: { key: this.spaceKey },
          status: "current",
          ancestors: [{ id: ancestorId }],
          body: { storage: { value: body, representation: "storage" } }
        });
      }

      // sometimes conf doesn't return pages for "get" lookup - title search
      // is case sensitive
      // TODO fallback to search API
      if (resp.status !== 200 && resp.data && resp.data.message) {
        throw new Error(
          `Failed to create or update page for title "${title}" - ` +
          `server returned error: ${resp.status} - ${resp.data.message}`
        );
      } else if (resp.status !== 200 || !resp || !resp.data || !resp.data.id) {
        throw new Error(
          `Failed to create or update page for title "${title}" - empty ` +
          `response, status code ${resp.status}`
        );
      }

      return {
        title,
        id: Number(resp.data.id)
      };
    } catch (err) {
      console.log(chalk.red(`Unexpected error while updating "${title}"`));
      throw err;
    }
  }
}

module.exports = ConfCloudClient;
