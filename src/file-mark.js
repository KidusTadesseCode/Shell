// src/file-mark.js
import inquirer from "inquirer";
import { exec } from "child_process";
import chalk from "chalk";
import fs from "fs";

const marker = "[Distribute-Complete]";

export function markMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const markedContent = `${marker}\n${content}`;
  fs.writeFileSync(filePath, markedContent);
  console.log(chalk.green(`Successfully marked: ${filePath}`));
  return;
}

export async function checkIfFileIsMarked(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const isMarked = content.split("\n")[0] === marker;

  if (isMarked) {
    const { shouldParseAgain } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldParseAgain",
        message: chalk.yellow(
          "This file appears to have been processed already. Would you like to proceed with the distribution again?"
        ),
        default: false,
      },
    ]);
    return shouldParseAgain;
  }
  return true;
}
