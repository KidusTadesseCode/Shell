#!/usr/bin/env node

import { parseMarkdown } from "./src/file-parser.js";
import { writeFiles } from "./src/file-writer.js";
import { runCommands } from "./src/command-runner.js";
import chalk from "chalk";
import path from "path";
import { markMarkdownFile, checkIfFileIsMarked } from "./src/file-mark.js";
import { prismaCoder } from "./src/coder/prismaCoder.js";
// const clear = "\x1Bc";
// console.log(clear);

const main = async () => {
  console.log(chalk.blue.bold("--- Starting File Distribution ---"));
  const markdownPath = path.join(
    process.cwd(),
    "Distribute",
    "distributeFiles.md"
  );

  try {
    const isMarked = await checkIfFileIsMarked(markdownPath);
    console.log("isMarked: ", isMarked);
    if (!isMarked) return;
    let { filesToDistribute, commandsToRun } = parseMarkdown(markdownPath);
    if (filesToDistribute.length > 0) {
      console.log(chalk.cyan("\n--- Distributing Files ---"));
      filesToDistribute = await prismaCoder(filesToDistribute);
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
