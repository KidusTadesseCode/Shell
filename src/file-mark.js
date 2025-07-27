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

export function checkIfFileIsMarked(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const isMarked = content.split("\n")[0] === marker;
  if (isMarked) {
    console.log(chalk.yellow(`File already marked: ${filePath}`));
    console.log(chalk.yellow("Are you sure you want to parse again?"));
  }
}
