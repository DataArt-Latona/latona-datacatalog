const _ = require("lodash");
const v = require("../util/validators");
const {
  OwnPropertyDefinitions,
  OwnProperties,
  OwnCollection
} = require("./OwnProperties");

const childrenStyles = {
  linkTable: "linkTable",
  linkList: "linkList",
  section: "section",
  confnotes: "confnotes"
};

/**
 * Represents page or page section within the catalog
 * @class
 */
class Pagection {
  /**
   * Constricts Pagection (page or page section)
   * @param {Object} properties
   * @param {string} properties.title
   * @param {string} properties.slug
   * @param {Object} properties.model
   * @param {Array} [properties.propertiesDefinitions]
   * @param {Object|Array} [properties.collectionsDefinitions]
   * @param {string} [properties.childrenStyle]
   * @param {Object} properties.childrenPropertiesDefinitions
   * @param {string} [properties.tableLinkProperty]
   * @param {string} [properties.customContent]
   * @param {Pagection} [properties.parent]
   * @param {Object} [properties.confConfig]
   */
  constructor({
    title,
    slug,
    model,
    propertiesDefinitions,
    collectionsDefinitions,
    childrenStyle,
    childrenPropertiesDefinitions,
    tableLinkProperty,
    customContent,
    parent,
    pageType,
    modelConfig
  }) {
    const makeOwnProperties = (m, def) => {
      if (m && def) {
        if (!v.validateObject(m)) throw new Error("model should be an object");
        if (!v.validateArrayNotEmpty(def))
          throw new Error("property definitions should be non-empty array");

        const ownPropDefs = new OwnPropertyDefinitions(def);
        const ownProps = OwnProperties.makeFromModel(m, ownPropDefs);

        return ownProps;
      }
    };

    const makeOwnCollections = (m, def) => {
      if (m && def) {
        if (!v.validateObject(m)) throw new Error("model should be an object");
        if (!v.validateObject(def))
          throw new Error("collections definition should be an object");

        return _.map(def, d => {
          if (!v.validateStringNotEmpty(d.collection))
            throw new Error(
              "'collection' should be non-empty string (path to collection array)"
            );
          if (!v.validateArrayNotEmpty(d.properties))
            throw new Error("property definitions should be non-empty array");

          const collectionTitle = d.heading;
          const collection = _.get(m, d.collection);
          const propertyDefinitions = d.properties;

          return OwnCollection.makeFromCollection(
            collection,
            new OwnPropertyDefinitions(propertyDefinitions),
            collectionTitle
          );
        });
      }
    };

    _.forEach({ title, slug }, (val, key) => {
      if (!v.validateStringNotEmpty(val))
        throw new Error(`${key} is expected to be non-empty string`);
    });

    switch (childrenStyle) {
      case childrenStyles.section:
        this.sections = [];
        break;
      case childrenStyles.linkList:
        this.linkList = [];
        break;
      case childrenStyles.confnotes:
        break;
      case childrenStyles.linkTable:
        if (!v.validateStringNotEmpty(tableLinkProperty))
          throw new Error(
            `tableLinkProperty should be non-empty string for ` +
            `"${childrenStyle}" children style`
          );

        if (!v.validateArrayNotEmpty(childrenPropertiesDefinitions))
          throw new Error(
            `childrenPropertiesDefinitions should be non-empty array for ` +
            `"${childrenStyle}" children style`
          );

        this.tableLinkProperty = tableLinkProperty;
        this.linkTable = new OwnCollection({
          definitions: new OwnPropertyDefinitions(childrenPropertiesDefinitions)
        });
        break;

      default:
        if (childrenStyle)
          throw new Error(`Unknown children style "${childrenStyle}"`);
    }

    this.title = title;
    this.slug = slug;
    this.childrenStyle = childrenStyle;
    this.parent = parent;
    this.customContent = customContent;
    this.pageType = pageType || "page";
    this.modelConfig = modelConfig;

    this.properties = makeOwnProperties(model, propertiesDefinitions);
    this.ownCollections = makeOwnCollections(model, collectionsDefinitions);

    if (parent) parent.addChild(this);
  }

  get hasLinkList() {
    return !!this.linkList;
  }

  get hasLinkTable() {
    return !!this.linkTable;
  }

  get hasSections() {
    return !!this.sections;
  }

  get hasProperties() {
    return !!this.properties && this.properties.hasVisible;
  }

  get hasCollections() {
    return !!this.ownCollections;
  }

  // TODO set up relationshipGroups 
  get hasRelationshipGroups() {
    return !!this.relationshipGroups && this.relationshipGroups.length > 0;
  }

  get notSection() {
    return (
      !this.parent ||
      (this.parent && this.parent.childrenStyle !== childrenStyles.section)
    );
  }

  get nestLevel() {
    if (this.notSection) return 1;
    return this.parent.nestLevel + 1;
  }

  get nextNestLevel() {
    return this.nestLevel + 1;
  }

  get nextNextNestLevel() {
    return this.nextNestLevel + 1;
  }

  get nestLevelMd() {
    return "#".repeat(this.nestLevel);
  }

  get nextNestLevelMd() {
    return "#".repeat(this.nextNestLevel);
  }

  get parentTitle() {
    if (this.parent) {
      if (this.parent.notSection) return this.parent.title;
      return this.parent.parentTitle;
    }
    return undefined;
  }

  get parentSlug() {
    if (this.parent) {
      if (this.parent.notSection) return this.parent.slug;
      return this.parent.parentSlug;
    }
    return undefined;
  }

  addChild(child) {
    if (!(child instanceof Pagection))
      throw new Error("child should be Pagection");

    try {
      const addLinkTableEntry = () => {
        // building new model as property definition for pagection and parent's
        // child may differ
        const childRow = this.linkTable.addRow(child.properties.model);
        const childRowLinkProp = childRow.getPropertyByName(
          this.tableLinkProperty
        );

        if (!childRowLinkProp)
          throw new Error(
            `Pagection "${child.title}" (slug = "${child.slug}") has no property "${this.tableLinkProperty}"`
          );

        childRowLinkProp.childSlug = child.slug;
        childRowLinkProp.childTitle = child.title;
      };

      switch (this.childrenStyle) {
        case childrenStyles.section:
          this.sections.push(child);
          break;

        case childrenStyles.linkList:
          this.linkList.push({
            title: child.title,
            slug: child.slug
          });
          break;
        case childrenStyles.linkTable:
          addLinkTableEntry();
          break;
        case childrenStyles.confnotes:
          break;

        default:
          throw new Error(`this pagection cannot have children`);
      }
    } catch (err) {
      throw new Error(
        `failed to add child "${child.title}" to pagection "${this.title}": ${err}`
      );
    }
  }
}

module.exports = Pagection;
