const tablePropertyDefinitions = [
  {
    name: "db",
    path: "db",
    title: "Database"
  },
  {
    name: "schema",
    path: "schema",
    title: "Schema"
  },
  {
    name: "tableName",
    path: "tableName",
    title: "Table name"
  },
  {
    name: "fieldCount",
    path: "fields.length",
    title: "Field count"
  }
];

const fieldPropertyDefinitions = [
  {
    name: "fieldName",
    path: "fieldName",
    title: "Field",
    showInLinkTable: true
  },
  {
    name: "sqlType",
    path: "sqlType",
    title: "SQL Type",
    showInLinkTable: true
  },
  {
    name: "isNull",
    path: "isNull",
    title: "Is Nullable?"
  }
];

const tableModel = {
  db: "foo",
  schema: "bar",
  tableName: "baz-a",
  fields: [
    { fieldName: "id", sqlType: "int" },
    { fieldName: "name", sqlType: "uniqueidentifier", isNull: true },
    { fieldName: "type", sqlType: "nvarchar(10)", isNull: true }
  ]
};

module.exports = {
  tablePropertyDefinitions,
  tableModel,
  fieldPropertyDefinitions
};
