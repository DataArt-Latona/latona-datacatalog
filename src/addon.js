/* eslint-disable no-param-reassign */
/*
  In progress:
    TODO: tests

  Next:
    TODO: Feature: element exclusion?
    TODO: document settings
*/

// load LatonaAddon class
const path = require("path");
const fsExt = require("fs-extra");
// const md = require("markdown-it")();

const ob = require("./addonInternals/optionsBuilder");
const pb = require("./addonInternals/pagesBuilder");

const { defaults } = ob;

const templatePath = path.resolve(__dirname, "./templates");
const partialsPath = path.resolve(templatePath, "./partials");

const partials = ["section", "rootPageLinks", "header", "footer"];

const commonTemplates = {
  pageTreeJson: path.resolve(templatePath, "pageTreeJson.mustache")
};

const formatTemplates = (format, pageType) =>
  path.resolve(templatePath, `${format}_${pageType}.mustache`);

const formatTemplatePartials = format =>
  partials
    .map(p => {
      return {
        name: p,
        path: path.resolve(partialsPath, `${format}_${p}.mustache`)
      };
    })
    // some template partials are format-specific
    .filter(partial => fsExt.existsSync(partial.path));

const extensions = {
  md: ".md",
  conf: ".confstorage",
  html: ".html"
};

const pageTypes = {
  page: "page",
  confnotes: "confnotes"
};

/**
 * creates an instance of addon
 * @param {Object} options addon options (usually specified in the project
 *   file). See {@link module:latona/addons/latona-core-autofields} for
 *   details.
 * @param {function} addonCreateCb callback that returns an instance
 *   of `LatonaAddon`
 * @returns {LatonaAddon}
 */
const create = (options, addonCreateCb) => {
  if (!addonCreateCb || typeof addonCreateCb !== "function") {
    throw new Error(`"addonCreateCb" is expected to be a function`);
  }

  const opt = ob.buildOptions(options);

  // create addon object with unique name and meaningful description
  const addon = addonCreateCb(
    "latona-datacatalog",
    "Latona addon for generating model-based data catalog"
  );

  /**
   * internal pages cache - to be populated on the first run of the pageTree
   * function and used later on.
   */
  let pagesCache;

  function pageTree(model, customContentPath) {
    if (pagesCache) return pagesCache;

    pagesCache = pb.buildPages(model, opt, customContentPath);

    return pagesCache;
  }

  /**
   * Builds collection of render items
   *
   * @param {Object[]} pages
   * @param {string} format
   */
  function getRenderItems(pages, format) {
    const items = [];

    if (pages && pages.length > 0) {
      pages.forEach(p => {
        items.push({
          fileName: `${opt.paths.outPath}/${p.slug}${extensions[format]}`,
          model: p,
          partials: formatTemplatePartials(format)
        });
      });
    }

    return items;
  }

  // add addon extensions
  addon
    // all model transformations are applied and model is transformed at this
    // stage, so this is the safest way to access the model for caching.
    .addPreprocessingTask(proj => {
      const customContentPathResolved = path.resolve(
        proj.getResolvedProjectPath(),
        opt.paths.customContentPath
      );
      try {
        pageTree(proj.transformedModel, customContentPathResolved);
      } catch (err) {
        throw new Error(`Failed to build page tree: ${err}`);
      }
    })
    //  render json with page tree
    .addRenderTask({
      // template should be a part of addon package
      template: commonTemplates.pageTreeJson,
      // project model will be passed to the itemBuilder
      itemsBuilder: model => {
        // array of items is expected as an output
        const items = [];

        if (pagesCache && pagesCache.length > 0) {
          pagesCache[pagesCache.length - 1].isLast = true;

          items.push({
            fileName: `${opt.paths.outPath}/${opt.pageTreeFileName}`,
            model: { pages: pagesCache }
          });
        }
        return items;
      }
    });

  // render all page types
  addon.addRenderTask({
    template: `${formatTemplates(opt.renderFormat, pageTypes.page)}`,
    itemsBuilder: model => {
      return getRenderItems(
        pagesCache.filter(p => p.pageType === pageTypes.page),
        opt.renderFormat
      );
    }
  });

  if (opt.renderFormat === pb.formats.conf) {
    addon.addRenderTask({
      template: `${formatTemplates(opt.renderFormat, pageTypes.confnotes)}`,
      itemsBuilder: model => {
        return getRenderItems(
          pagesCache.filter(p => p.pageType === pageTypes.confnotes),
          opt.renderFormat
        );
      }
    });
  }

  return addon;
};

// addon module should export the `create` function and `defaults` object
module.exports.create = create;
module.exports.defaults = defaults;
