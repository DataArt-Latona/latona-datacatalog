# Latona - Data Catalog <!-- omit in toc -->

Latona addon for generating model-based human-readable data catalog pages
(md, html, Confluence Cloud)

- [Disclaimer](#disclaimer)
- [Usage](#usage)
  - [Quick start](#quick-start)
  - [Addon options](#addon-options)
  - [Upload pages to Confluence Cloud](#upload-pages-to-confluence-cloud)
- [Contributing](#contributing)
- [License](#license)

## Disclaimer

This is _NOT_ a fully-fledged data catalog implementation like [Apache Atlas](https://atlas.apache.org/). This
is just an addon to [Latona](https://github.com/DataArt-Latona/latona) code
generator. This addon renders a set of pages to simplify digesting metadata
in a user-friendly way. Nothing more than that.

We used this tool on a number occasions, usually when it is too early to start
thinking about heavy data cataloging tools, but presenting some collected
metadata is beneficial.

## Usage

### Quick start

1. Install Latona - see [latona documentation](https://github.com/DataArt-Latona/latona#install)
2. Scaffold model and project - see [latona documentation](https://github.com/DataArt-Latona/latona#use)
3. Add `latona-datacatalog` addon to `package.json`:

```sh
npm i latona-datacatalog
```

4. Add `latona-datacatalog` to your latona project. To use the default
   configuration add this snippet to the `addons` array:

```json
{
  "moduleName": "latona-datacatalog",
  "options": {
    "renderFormat": "md"
  }
}
```

5. Add tables to your model. See our [test model](./test/mocks/addon.spec/model.json)
   for examples. Data catalog expects `tables` array to be at the root of the model.

6. Add extra collections for other catalogs. Default configuration will look for
   `collections.businessProcesses` for business process catalog, and for
   `collections.applications` for applications catalog. Nothing bad will happen
   if these are missing - respective catalogs will be empty in this case.

7. Add relationship types to your model. They should land in `collections.relationships`
   by default. Each relationship type should be structured as follows (titles
   are used to group relationship links at the catalog item's page):

```json
{
  "id": "string",
  "title_forward": "string",
  "title_backward": "string"
}
```

8. Add relationship records. The default place for them is at `collections.relationshipTypes`.
   `typeId` should be one of defined at the previous steps, `source` is the
   source (upstream) object's slug, `target` is the target (downstream) object's
   slug.
   Typical relationship looks like this:

```json
{
  "typeId": "fk",
  "source": "[orders].[dbo].[FactOrderItem]",
  "target": "[orders].[dbo].[DimClient]"
}
```

9. Add custom markdown content to the `./content` folder (use item's slug as a
   file name).

10. Render as described in the [Latona's guide](https://github.com/DataArt-Latona/latona#use).

### Addon options

Please refer for more information to these source files:

- [Default configuration](./src/addonInternals/latona-datacatalog-options-defaults.json)
- [Options schema](./src/addonInternals/latona-datacatalog-options-schema.json)
- [Test model](./test/mocks/addon.spec/model.json)

| Option                                                                          | Type                                      | Required                               | Description                                                                                                                                    |
| ------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| paths                                                                           | object                                    | yes                                    |                                                                                                                                                |
| paths.outPath                                                                   | string                                    | yes                                    | output path (default: `./output`)                                                                                                              |
| paths.customContentPath                                                         | string                                    | yes                                    | path to the folder with custom markdown files (use slug for names and custom markdown will be injected)                                        |
| renderFormat                                                                    | enum ["md", "html", "conf"]               | yes                                    |                                                                                                                                                |
| pageTreeFileName                                                                | string                                    | yes                                    | filename for the JSON file with the list of all generated pages                                                                                |
| conf                                                                            | object                                    |                                        | Confluence-specific configuration                                                                                                              |
| conf.createNotesPage                                                            | boolean                                   |                                        | `true` by default                                                                                                                              |
| conf.notesSlugSuffix                                                            | string                                    | yes (only if parent object is present) | Slug suffix for "notes" pages - empty pages that may be editted directly at Confluence. Notes pages are injected into catalog pages via macro. |
| conf.notesTitleSuffix                                                           | string                                    | yes (only if parent object is present) | Suffix for "notes" page titles.                                                                                                                |
| conf.modelConfig                                                                | object                                    | yes (only if parent object is present) |                                                                                                                                                |
| conf.modelConfig.spaceKey                                                       | string                                    | yes (only if parent object is present) | Confluence space key                                                                                                                           |
| catalogs                                                                        | object                                    | yes (only if parent object is present) | Catalogs configuration (there may be many)                                                                                                     |
| catalogs.&lt;catalogName&gt;                                                    | object                                    | yes                                    | Catalog configuration object. Only latin letters.                                                                                              |
| catalogs.&lt;catalogName&gt;.collection                                         | string                                    | yes                                    | path to array of catalog items (from the model root)                                                                                           |
| catalogs.&lt;catalogName&gt;.title                                              | string                                    | yes                                    | catalog title                                                                                                                                  |
| catalogs.&lt;catalogName&gt;.slug                                               | string                                    | yes                                    | catalog slug (url-friendly string)                                                                                                             |
| catalogs.&lt;catalogName&gt;.sectionBy                                          | object                                    |                                        | sectioning configuration (at least `first` level should be described, only two levels are supported)                                           |
| catalogs.&lt;catalogName&gt;.sectionBy.first                                    | object                                    | yes (only if parent object is present) | first level of grouping                                                                                                                        |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[]                       | array                                     | yes (only if parent object is present) | properties to group by                                                                                                                         |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[].name                  | string                                    | yes                                    | property name (for internal use only)                                                                                                          |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[].path                  | string                                    | yes                                    | property path (relative to catalog item)                                                                                                       |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[].title                 | string                                    | yes                                    | property title                                                                                                                                 |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[].show                  | boolean                                   |                                        | show property                                                                                                                                  |
| catalogs.&lt;catalogName&gt;.sectionBy.first.properties[].showInLinkTable       | boolean                                   |                                        | show property on the parent page if `"inParentAs": "linkTable"`                                                                                |
| catalogs.&lt;catalogName&gt;.sectionBy.first.inParentAs                         | enum ["linkTable", "linkList", "section"] | yes (only if parent object is present) | sets how to show sections on the parent page (catalog root page for the first level of grouping)                                               |
| catalogs.&lt;catalogName&gt;.sectionBy.first.tableLinkProperty                  | string                                    |                                        | sets which property should be used for linking to the section details page                                                                     |
| catalogs.&lt;catalogName&gt;.sectionBy.first.titleTemplate                      | string                                    | yes (only if parent object is present) | section title template (variable expansion is supported)                                                                                       |
| catalogs.&lt;catalogName&gt;.sectionBy.first.slugTemplate                       | string                                    | yes (only if parent object is present) | section slug template (variable expansion is supported)                                                                                        |
| catalogs.&lt;catalogName&gt;.sectionBy.second                                   | object                                    |                                        | see `catalogs.&lt;catalogName&gt;.sectionBy.first`                                                                                             |
| catalogs.&lt;catalogName&gt;.details                                            | object                                    | yes                                    | see `catalogs.&lt;catalogName&gt;.sectionBy.first`                                                                                             |
| catalogs.&lt;catalogName&gt;.detailsCollections                                 | object                                    |                                        | describes inner collections for the catalog's item (e.g.: if database table is a catalog item, then table fields is the inner collection)      |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;                    | object                                    | yes (only if parent object is present) | Collection configuration object. Only latin letters.                                                                                           |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.collection         | string                                    | yes (only if parent object is present) | path to array of collection items (relative to item)                                                                                           |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.properties[]       | array                                     | yes (only if parent object is present) | collection properties                                                                                                                          |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.properties[].name  | string                                    | yes (only if parent object is present) | property name (for internal use only)                                                                                                          |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.properties[].path  | string                                    | yes (only if parent object is present) | property path (relative to collection item)                                                                                                    |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.properties[].title | string                                    | yes (only if parent object is present) | property title                                                                                                                                 |
| catalogs.&lt;catalogName&gt;.detailsCollections.&lt;name&gt;.heading            | string                                    | yes (only if parent object is present) | section's title                                                                                                                                |
| relationshipsCollection                                                         | string                                    | yes                                    | path to array of relationships (relative to `collections` object within the latona model)                                                      |
| relationshipTypesCollection                                                     | string                                    | yes                                    | path to array of relationship types (relative to `collections` object within the latona model)                                                 |
| dropDefaultCatalogs                                                             | boolean                                   |                                        | `false` by default, removes default catalogs configuration if `true`                                                                           |

### Upload pages to Confluence Cloud

The `latona-datacatalog` package also includes `dc2confcloud` utility which
enables automated upload of pages to your Confluence Cloud space.

1. Install the package globally to use this tool:

```
npm i -g latona-datacatalog
```

2. Create the configuration json:

```json
{
  "confluence": {
    "baseUrl": "<your_account>.atlassian.net",
    "spaceKey": "<your_space_key>"
  },
  "contentFolder": "./path/to/generated/conf/output",
  "notesSuffix": " - Notes", // see addon options
  "pageTree": "___page_tree___.json", // see addon options
  // specify parent pages for each "root" catalog page
  "parents": [
    {
      "slug": ".datacatalog",
      "confPageId": 123456789 // you need to create this page manually
    },
    {
      "slug": ".datacatalog-notes",
      "confPageId": 123456789 // you need to create this page manually
    },
    {
      "slug": ".bpcatalog",
      "confPageId": 123456789 // you need to create this page manually
    },
    {
      "slug": ".bpcatalog-notes",
      "confPageId": 123456789 // you need to create this page manually
    },
    {
      "slug": ".appcatalog",
      "confPageId": 123456789 // you need to create this page manually
    },
    {
      "slug": ".appcatalog-notes",
      "confPageId": 123456789 // you need to create this page manually
    }
  ]
}
```

3. Run the tool:

```
dc2confcloud -u <your_user_name> -t <your_access_token> -c <./path/to/dc2confcloud.json>
```

Usage details:

```
Usage: dc2confcloud [options]

Options:
  -u, --user <user>      Confluence user name (email)
  -t, --token <token>    Confluence access token
  -c, --config <config>  path to dc2confcloud's configuration json (default: "./dc2confcloud.json")
  -h, --help             display help for command
```

## Contributing

Please read our [Latona's contribution guidelines](https://github.com/DataArt-Latona/latona/blob/master/docs/dev/CONTRIBUTING.md)
for details on our development approach, and the process for submitting pull
requests to us. All contributors should comply with our
[Latona's Code of Conduct](https://github.com/DataArt-Latona/latona/blob/master/CODE_OF_CONDUCT.md)

## License

**Latona** is copyright (c) 2019-present DataArt (www.dataart.com) and all
contributors and licensed under the Apache License, Version 2.0.
See the [LICENSE](./LICENSE) file for more details.
