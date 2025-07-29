#!/usr/bin/env node
// index.js
import { parseMarkdown } from "./src/file-parser.js";
import { writeFiles } from "./src/file-writer.js";
import { runCommands } from "./src/command-runner.js";
import chalk from "chalk";
import path from "path";
import { markMarkdownFile, checkIfFileIsMarked } from "./src/file-mark.js";
import { prismaCoder } from "./src/libs/coder/prismaLibs/prismaCoder.js";
const clear = "\x1Bc";
console.log(clear);

const markdownPath = path.join(
  process.cwd(),
  "Distribute",
  "distributeFiles.md"
);

const main = async () => {
  console.log(chalk.blue.bold("--- Starting File Distribution ---"));

  try {
    const isMarked = await checkIfFileIsMarked(markdownPath);
    if (!isMarked) return;
    let { filesToDistribute, commandsToRun } = await parseMarkdown(
      markdownPath
    );
    if (filesToDistribute.length > 0) {
      console.log(chalk.cyan("\n--- Distributing Files ---"));

      const result = await prismaCoder(filesToDistribute, commandsToRun);
      filesToDistribute = result.filesToDistribute;
      commandsToRun = result.commandsToRun;

      writeFiles(filesToDistribute);
    } else {
      console.log(chalk.yellow("No files to distribute."));
    }

    if (commandsToRun.length > 0) {
      await runCommands(commandsToRun);
    } else {
      console.log(chalk.yellow("\nNo commands found in the markdown file."));
    }
    markMarkdownFile(markdownPath);
  } catch (error) {
    console.error(chalk.red.bold("\nAn error occurred:"), error.message);
  } finally {
    console.log(chalk.blue.bold("\n--- Distribution Process Finished ---"));
  }
};

main();
