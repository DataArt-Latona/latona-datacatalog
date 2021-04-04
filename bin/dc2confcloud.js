#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * dc2confcloud - sends data catalog content to the Confluence Cloud space.
 */

const chalk = require("chalk");
const { Command } = require("commander");
const fs = require("fs-extra");
const dc2cc = require("../src/cli/dc2cc");
const packageJson = require("../package.json");

/**
 * dc2confcloud main function
 * @param {string[]} argv command-line arguments
 * @param {[bool]} rethrow rethrow all exceptions (used for testing purposes and
 *   automation) (default: false)
 * @param {[function]} exitCallback Commander exit callback (default: undefined)
 * @private
 */
async function main(argv, rethrow = false, exitCallback = undefined) {
  const programName = "dc2confcloud";
  const programDesc =
    "Sends data catalog content to the Confluence Cloud space.";

  try {
    const program = new Command();
    program.name(programName);

    if (exitCallback && typeof exitCallback === "function") {
      program.exitOverride(exitCallback);
    }

    program
      .option("-u, --user <user>", "Confluence user name (email)")
      .option("-t, --token <token>", "Confluence access token")
      .option(
        "-c, --config <config>",
        `path to ${programName}'s configuration json - see project documentation for details`,
        `./${programName}.json`
      );

    console.log(`${programName} (${packageJson.version})`);
    console.log(`${programDesc}\n`);
    program.parse(argv);

    // param validation
    if (!program.user) throw new Error("user name is required");
    if (!program.token) throw new Error("access token is required");
    if (!program.config)
      throw new Error("path to configuration json is required");
    if (!fs.existsSync(program.config))
      throw new Error(`File '${program.config}' not found`);

    const config = fs.readJSONSync(program.config);

    await dc2cc(config, {
      config: program.config,
      user: program.user,
      token: program.token
    });

    console.log(chalk.green("Done!"));
  } catch (error) {
    console.log(chalk.red(`${error}`));
    console.log(
      chalk.red(
        `Use '${programName} -h' to get help on syntax or refer to the project documentation.`
      )
    );

    // this is for testing purposes only
    if (rethrow) throw error;
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = main;
