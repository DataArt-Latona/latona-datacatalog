/* eslint-disable no-param-reassign */
const _ = require("lodash");
const path = require("path");
const fse = require("fs-extra");
const md = require("markdown-it")();
const Pagection = require("./Pagection");

const formats = {
  md: "md",
  html: "html",
  conf: "conf"
};

const pagectionTypes = {
  page: "page",
  section: "section",
  confnotes: "confnotes"
};

const groupBy = (list, props) => {
  const prop = _.head(props);
  const tail = props.length > 1 ? _.tail(props) : undefined;

  let groups = _.groupBy(list, prop);
  // that's recursion - need to flat or array of array of arrays
  groups = _.flatMap(groups, (items, groupKey) => {
    // this is not the end - we'll make another step
    if (tail) {
      const tailGroups = groupBy(items, tail);
      return _.map(tailGroups, tailGroup => {
        // merging all key properties to one object
        const key = _.cloneDeep(tailGroup.key);
        _.set(key, prop, groupKey);
        return {
          key,
          items: tailGroup.items
        };
      });
    }

    // got to the bottom - flowing back
    const key = _.set({}, prop, groupKey);
    return { key, items };
  });

  return groups;
};

const makePagection = opt => {
  const {
    model,
    sectionDef,
    parent,
    nextSectionDef,
    collectionsDefinitions,
    modelConfig
  } = opt;
  const makeTitle = _.template(sectionDef.titleTemplate);
  const makeSlug = _.template(sectionDef.slugTemplate);
  const childrenStyle = nextSectionDef ? nextSectionDef.inParentAs : undefined;
  const childrenPropertiesDefinitions = nextSectionDef
    ? nextSectionDef.properties.filter(p => p.showInLinkTable)
    : undefined;
  const tableLinkProperty = nextSectionDef
    ? nextSectionDef.tableLinkProperty
    : undefined;

  let pagection;
  try {
    pagection = new Pagection({
      title: makeTitle(model),
      slug: makeSlug(model),
      model,
      propertiesDefinitions: sectionDef.properties,
      collectionsDefinitions,
      childrenStyle,
      childrenPropertiesDefinitions,
      tableLinkProperty,
      parent,
      modelConfig
    });
  } catch (e) {
    throw new Error(`Pagection creating error: '${e.message}'`);
  }
  return pagection;
};

const groupAndBuildPagections = (
  parent,
  items,
  sectionDef,
  nextSectionDef,
  modelConfig
) => {
  const groupingResult = [];

  const groupingProps = sectionDef.properties.map(p => p.path);
  const itemGroups = groupBy(items, groupingProps);

  itemGroups.forEach(ig => {
    const igPagection = makePagection({
      model: { ...ig.key, $items: ig.items },
      sectionDef,
      parent,
      nextSectionDef,
      modelConfig
    });

    groupingResult.push({
      parent: igPagection,
      itemsCollection: ig.items
    });
  });

  return groupingResult;
};

const getCustomContent = (slug, customContentFolderResolved, renderFormat) => {
  const contentFileName = path.resolve(
    customContentFolderResolved,
    `${slug}.md`
  );

  let res = "";
  if (fse.existsSync(contentFileName)) {
    res = fse.readFileSync(contentFileName, "utf-8");
  }
  if (res && renderFormat !== formats.md) {
    res = md.render(res);
  }
  return res;
};

/**
 * Internal function to traverse relations array
 *
 * @param {Object[]} relationships
 * @param {Object[]} relationshipTypes
 * @param {string} pageSlug
 * @param {bool} [searchForward] defaults to `true`
 *
 * @private
 */
const buildRelationshipsArray = (
  pages,
  relationships,
  relationshipTypes,
  pageSlug,
  searchForward = true
) => {
  const myField = searchForward ? "source" : "target";
  const otherField = searchForward ? "target" : "source";
  const titleField = searchForward ? "title_forward" : "title_backward";

  return (
    relationships
      .filter(rel => rel[myField] === pageSlug)
      // do not fail on missing pages (as may be sections)
      .filter(rel => pages.some(lp => lp.slug === rel[otherField]))
      .map(rel => {
        const relType = relationshipTypes.find(rt => rt.id === rel.typeId);

        if (!relType || !relType[titleField]) {
          throw new Error(`Failed to find relation type ${rel.typeId}`);
        }

        const linkedPage = pages.find(lp => lp.slug === rel[otherField]);

        if (!linkedPage) {
          throw new Error(
            `Failed to find page for linked object ${rel[otherField]}`
          );
        }

        return {
          typeTitle: relType[titleField],
          linkedPageSlug: linkedPage.slug,
          linkedPageTitle: linkedPage.title
        };
      })
  );
};

const buildCatalog = (
  model,
  catalog,
  customContentFolderResolved,
  renderFormat,
  conf
) => {
  let catalogPages = [];
  const catalogPageсtions = [];

  const addPagectionToArrays = (pagection, isPage) => {
    if (customContentFolderResolved) {
      pagection.customContent = getCustomContent(
        pagection.slug,
        customContentFolderResolved,
        renderFormat
      );
    }

    catalogPageсtions.push(pagection);
    if (isPage) catalogPages.push(pagection);
  };

  // get leaf-level items
  const itemsCollection = _.get(model, catalog.collection);

  // nothing to do if there are no items
  // TODO: refactor this- no need to get here
  if (!itemsCollection || !Array.isArray(itemsCollection)) {
    throw new Error(`Model doesn't have appropriate collection`);
  }

  // construct page/section options order
  const sectionOpts = [];
  if (catalog.sectionBy) {
    if (typeof catalog.sectionBy.first === 'object') {
      sectionOpts.push(catalog.sectionBy.first);
    } else {
      throw new Error(`'first' field of sectionBy should be of type 'object'`)
    }
    if (catalog.sectionBy.second) {
      if (typeof catalog.sectionBy.second === 'object') {
        sectionOpts.push(catalog.sectionBy.second);
      } else {
        throw new Error(`'second' field of sectionBy should be of type 'object'`)
      }
    }
  }
  sectionOpts.push(catalog.details);

  // catalog root page
  const rootPage = new Pagection({
    title: catalog.title,
    slug: catalog.slug,
    childrenStyle: sectionOpts[0].inParentAs,
    childrenPropertiesDefinitions: sectionOpts[0].properties.filter(
      p => p.showInLinkTable
    ),
    tableLinkProperty: sectionOpts[0].tableLinkProperty,
    modelConfig: conf.modelConfig
  });

  addPagectionToArrays(rootPage, true);

  // group and build group pagections
  const leafDef = _.last(sectionOpts);
  const groupDefs = _.dropRight(sectionOpts);
  let itemsToGroup = [{ parent: rootPage, itemsCollection }];

  // going through sectionBy members
  groupDefs.forEach((groupDef, groupDefIndex, groupDefArr) => {
    const nextGroupDef =
      groupDefIndex < groupDefArr.length - 1
        ? groupDefArr[groupDefIndex + 1]
        : leafDef;

    // making next-level collection of collections
    itemsToGroup = _.flatMap(itemsToGroup, itemsColl => {
      const newSubGroups = groupAndBuildPagections(
        itemsColl.parent,
        itemsColl.itemsCollection,
        groupDef,
        nextGroupDef,
        conf.modelConfig
      );

      newSubGroups
        .map(newSubGroup => newSubGroup.parent)
        .forEach(pagection => {
          addPagectionToArrays(
            pagection,
            itemsColl.parent.childrenStyle !== pagectionTypes.section
          );
        });

      return newSubGroups;
    });
  });

  // all groups are done - building detailed pagection(s)
  itemsToGroup.forEach(itemsColl => {
    const { parent, itemsCollection: items } = itemsColl;
    items.forEach(item => {
      const pagection = makePagection({
        model: item,
        sectionDef: leafDef,
        parent,
        collectionsDefinitions: catalog.detailsCollections,
        modelConfig: conf.modelConfig
      });
      addPagectionToArrays(
        pagection,
        itemsColl.parent.childrenStyle !== pagectionTypes.section
      );
    });
  });

  // conf specific
  if (conf && conf.createNotesPage) {
    // TODO: refactor this

    const confRootPage = new Pagection({
      title: `${catalog.title}${conf.notesTitleSuffix}`,
      slug: `${catalog.slug}${conf.notesSlugSuffix}`,
      childrenStyle: pagectionTypes.confnotes,
      pageType: pagectionTypes.confnotes,
      modelConfig: conf.modelConfig
    });

    confRootPage.confParentTitle = catalog.title;

    const notePagePairs = catalogPages
      .filter(page => page.slug !== catalog.slug)
      .map(page => {
        return {
          confnotes: new Pagection({
            title: `${page.title}${conf.notesTitleSuffix}`,
            slug: `${page.slug}${conf.notesSlugSuffix}`,
            parent: confRootPage,
            pageType: pagectionTypes.confnotes,
            modelConfig: conf.modelConfig
          }),
          page
        };
      });

    notePagePairs.forEach(pp => {
      pp.confnotes.confParentTitle = pp.page.title;
    });

    const notePages = notePagePairs.map(pp => pp.confnotes);

    catalogPages.forEach(page => {
      page.confNotesTitle = `${page.title}${conf.notesTitleSuffix}`;
    });

    catalogPages.push(confRootPage);
    catalogPages = [...catalogPages, ...notePages];
  }

  return { catalogPages, catalogPageсtions };
};

/**
 *
 * @param {Object} model
 * @param {Object} options
 * @param {string} customContentFolderResolved
 */
const buildPages = (model, options, customContentFolderResolved) => {
  let pages = [];
  let pagections = [];

  if (!model) {
    throw new Error(`Model parameter shouldn't be empty`)
  };

  if (!options) {
    throw new Error(`Options parameter shouldn't be empty`)
  }

  // 1. iterate catalogs and build pages
  _.forEach(options.catalogs, catalog => {
    const catalogContent = buildCatalog(
      model,
      catalog,
      customContentFolderResolved,
      options.renderFormat,
      options.conf
    );
    pages = [...pages, ...catalogContent.catalogPages];
    pagections = [...pagections, ...catalogContent.catalogPageсtions];
  });

  // 2. make relationships
  if (
    model.collections &&
    model.collections[options.relationshipsCollection] &&
    model.collections[options.relationshipTypesCollection]
  ) {
    // get relations and relation types collection
    const relationships = model.collections[options.relationshipsCollection];
    const relTypes = model.collections[options.relationshipTypesCollection];

    // we'll process pages one by one to ...
    pages
      .filter(page => page.pageType === pagectionTypes.page)
      .forEach(page => {
        // 1. find all links where this page is either source or target
        const pageRelations = [
          ...buildRelationshipsArray(
            pages,
            relationships,
            relTypes,
            page.slug,
            true
          ),
          ...buildRelationshipsArray(
            pages,
            relationships,
            relTypes,
            page.slug,
            false
          )
        ];

        // 2. get unique titles for relation types
        const pageRelTypeTitles = [
          ...new Set(pageRelations.map(r => r.typeTitle))
        ];

        // 3. group links by relation type and inject into page object
        page.relationshipGroups = pageRelTypeTitles.map(typeTitle => {
          return {
            typeTitle,
            pages: pageRelations.filter(pr => pr.typeTitle === typeTitle)
          };
        });
      });
  }

  // 3. inject links to "root" pages (except conf)
  if (options.renderFormat !== formats.conf) {
    const allCatalogs = _.map(options.catalogs, catalog => {
      const { title, slug } = catalog;
      return {
        title,
        slug
      };
    });

    pages
      .filter(page => page.pageType === pagectionTypes.page)
      .forEach(p => {
        p.allCatalogs = allCatalogs;
      });
  }

  return pages;
};

module.exports = { buildPages, formats };
