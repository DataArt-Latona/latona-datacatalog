/* eslint-disable no-console */
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const pLimit = require("p-limit");

const validators = require("../util/validators");
const ConfCloudClient = require("./confCloudClient");

/**
 * Reads content from the content folder and submits it to a Confluence Cloud
 *   space via the `ConfCloudClient`
 *
 * @param {Object} config Configuration (as read from the json file)
 * @param {Object} config.confluence Confluence client settings
 * @param {Object} config.confluence.baseUrl Confluence instance URL (typically
 *  <foobar>.atlassian.net)
 * @param {Object} config.confluence.spaceKey confluence space key (2-4 chars)
 * @param {string} config.contentFolder Path to the content folder
 * @param {string} config.pageTree Filename for the json file containing
 *   page list/tree
 * @param {Object[]} config.parents Configuration (as read from the json file)
 * @param {Object[]} config.parents.slug Generated page's slug
 * @param {Object[]} config.parents.confPageId The ID of the **ancestor** page
 *   for the given top-level generated page. The ancestor page should exist.
 * @param {string} config.notesSuffix Suffix applied to "notes" page titles -
 *   will be used to suppress content updates
 * @param {Object} args non-persistent arguments
 * @param {string} args.config path to the configuration json file
 * @param {string} args.user user name (email)
 * @param {string} args.token access token
 */
async function dc2cc(config, args) {
  console.log(chalk.green("Using config:"));
  console.log(config);

  const { confluence, contentFolder, pageTree, parents, notesSuffix } = config;

  // config validation
  console.log(chalk.green("Validating..."));
  if (!validators.validateObject(confluence))
    throw new Error("'confluence' is expected to be an object");
  if (!validators.validateStringNotEmpty(confluence.baseUrl))
    throw new Error("'confluence.baseUrl' is expected to be non-empty string");
  if (!validators.validateStringNotEmpty(confluence.spaceKey))
    throw new Error("'confluence.spaceKey' is expected to be non-empty string");
  if (!validators.validateStringNotEmpty(contentFolder))
    throw new Error("'contentFolder' is expected to be non-empty string");
  if (!validators.validateStringNotEmpty(pageTree))
    throw new Error("'pageTree' is expected to be non-empty string");
  if (!validators.validateArrayNotEmpty(parents))
    throw new Error("'parents' is expected to be non-empty array");
  if (!validators.validateStringNotEmpty(notesSuffix))
    throw new Error("'notesSuffix' is expected to be string or empty");

  // resolve paths
  console.log(chalk.green("Resolving paths..."));
  const resolvedConfigPath = path.resolve(process.cwd(), args.config);
  const configFolder = path.dirname(resolvedConfigPath);
  const resolvedContentFolder = path.resolve(configFolder, contentFolder);
  const resolvedPageTreeFile = path.resolve(resolvedContentFolder, pageTree);

  if (!(await fs.exists(resolvedContentFolder)))
    throw new Error(`Path "${resolvedContentFolder}" doesn't exist`);
  if (!(await fs.exists(resolvedPageTreeFile)))
    throw new Error(`File "${resolvedContentFolder}" doesn't exist`);

  // read page tree
  console.log(chalk.green("Reading page tree..."));
  const pages = await fs.readJson(resolvedPageTreeFile);

  console.log(chalk.green(`Now processing ${pages.length} pages...`));

  // get page id's for root parents
  console.log(chalk.green(`Looking up for ancestors for root pages...`));
  let allPages = [];
  try {
    allPages = pages.map(p => {
      return {
        ...p,
        ancestorId: p.parentSlug
          ? undefined
          : parents.find(anc => anc.slug === p.slug).confPageId,
        processed: false,
        isRoot: !p.parentSlug,
        body: fs.readFileSync(
          path.resolve(resolvedContentFolder, `${p.slug}.confstorage`),
          "utf-8"
        )
      };
    });
  } catch (e) {
    // TODO: adjust the message
    console.log(chalk.red(`Error while looking up for ancestors for root pages`, e));
  }

  if (allPages.some(rp => rp.isRoot && !rp.ancestorId)) {
    console.log(
      chalk.yellow(
        "Warning: these root pages have no specified parents and will be ignored:"
      )
    );
    console.log(
      allPages
        .filter(rp => rp.isRoot && !rp.ancestorId)
        .map(rp => {
          return { title: rp.title, slug: rp.slug };
        })
    );
  }

  const ccc = new ConfCloudClient(
    confluence.baseUrl,
    confluence.spaceKey,
    args.user,
    args.token
  );

  // create or update root pages and capture (title,id) tuples
  // create or update children and capture (title,id) tuples
  let level = 0;
  while (allPages.some(p => !!p.ancestorId && !p.processed) && level < 10) {
    level += 1;
    console.log(chalk.yellow(`Updating content - level ${level}`));

    const limit = pLimit(config.simultaneousThreads);
    const createPromises = allPages
      .filter(p => !!p.ancestorId && !p.processed)
      .map(p => {
        const noUpdate = !!notesSuffix && p.title.endsWith(notesSuffix);
        return limit(() =>
          ccc.createOrUpdateContentByTitle(
            p.title,
            p.ancestorId,
            p.body,
            noUpdate
          )
        );
      });

    let responses = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      responses = await Promise.all(createPromises);
    } catch (e) {
      // TODO: adjust the message
      console.log(chalk.red(`Error while creating or updating pages content by title`, e));
    }

    responses.forEach(r => {
      const page = allPages.find(p => p.title === r.title);
      page.processed = true;

      allPages
        .filter(p => p.parentSlug === page.slug && !p.processed)
        .forEach(p => {
          // eslint-disable-next-line no-param-reassign
          p.ancestorId = r.id;
        });
    });

    console.log(
      chalk.yellow(`Done with level ${level}, resolved page IDs are:`)
    );
    console.log(responses);
  }
}

module.exports = dc2cc;
