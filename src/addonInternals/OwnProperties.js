const _ = require("lodash");
const v = require("../util/validators");

class OwnPropertyDefinition {
  constructor(definition) {
    ["name", "path", "title"].forEach(p => {
      if (!v.validateStringNotEmpty(definition[p]))
        throw new Error(
          `${p} should be non-empty string for ${JSON.stringify(definition)}`
        );
    });

    _.assign(this, definition);
  }
}

class OwnPropertyDefinitions {
  constructor(definitions) {
    if (!v.validateArrayNotEmpty(definitions))
      throw new Error("definitions should be non-empty array");

    this.definitions = [];

    definitions.forEach(d => {
      // pre-caution - the line below is for backward compatibility
      const ownProp =
        d instanceof OwnPropertyDefinition ? d : new OwnPropertyDefinition(d);

      if (this.definitions.some(addedDef => addedDef.name === ownProp.name))
        throw new Error(
          `name duplication detected for property ` +
            `definition ${JSON.stringify(d)}`
        );

      this.definitions.push(ownProp);
    });
  }
}

class OwnProperty {
  constructor(definition, value) {
    if (!(definition instanceof OwnPropertyDefinition))
      throw new Error(
        "definition should be an instance of OwnPropertyDefinition"
      );

    this.name = definition.name;
    this.value = value;
    this.definition = definition;
  }
}

class OwnProperties {
  constructor(definitions) {
    if (!(definitions instanceof OwnPropertyDefinitions))
      throw new Error(
        "definitions should be an instance of OwnPropertyDefinitions"
      );
    this.definitions = definitions;
    this.properties = [];
  }

  add(prop) {
    if (!(prop instanceof OwnProperty))
      throw new Error("prop should be an instance of OwnProperty");

    if (!this.definitions.definitions.some(d => d.name === prop.name))
      throw new Error(`prop.name ${prop.name} is not in definitions`);

    if (this.properties.some(p => p.name === prop.name))
      throw new Error(`property with name "${prop.name}" already added`);

    this.properties.push(prop);
    return prop;
  }

  getPropertyByName(name) {
    return this.properties.find(p => p.name === name);
  }

  get hasVisible() {
    return this.properties.some(p => p.definition.show);
  }

  get visibleProperties() {
    return this.properties.filter(p => p.definition.show);
  }

  get model() {
    const res = {};

    this.definitions.definitions.forEach(d => {
      _.set(res, d.path, this.getPropertyByName(d.name).value);
    });

    return res;
  }

  static makeFromModel(model, definitions) {
    if (!v.validateObject(model))
      throw new Error("model expected to be an object");

    const props = new OwnProperties(definitions);
    definitions.definitions.forEach(d => {
      props.add(new OwnProperty(d, _.get(model, d.path)));
    });

    return props;
  }
}

class OwnCollection {
  constructor({ title, definitions }) {
    if (!v.validateStringOrEmpty(title))
      throw new Error("title should be string or empty");
    if (!(definitions instanceof OwnPropertyDefinitions))
      throw new Error(
        "definitions should be an instance of OwnPropertyDefinitions"
      );

    this.title = title;
    this.definitions = definitions;
    this.rows = [];
  }

  addRow(row) {
    const props = OwnProperties.makeFromModel(row, this.definitions);
    this.rows.push(props);
    return props;
  }

  static makeFromCollection(collection, definitions, title) {
    if (!v.validateObject(collection) && !Array.isArray(collection))
      throw new Error("model expected to be an object or array");

    try {
      const ownCollection = new OwnCollection({ title, definitions });
      _.forEach(collection, el => {
        ownCollection.addRow(el);
      });

      return ownCollection;
    } catch (err) {
      throw new Error(`Failed to make OwnCollection: ${err}`);
    }
  }
}

module.exports = {
  OwnPropertyDefinition,
  OwnPropertyDefinitions,
  OwnProperty,
  OwnProperties,
  OwnCollection
};
