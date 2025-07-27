// src/command-runner.js
import inquirer from "inquirer";
import { exec } from "child_process";
import chalk from "chalk";

export const runCommands = async (commands) => {
  if (commands.length === 0) {
    console.log(chalk.yellow("No commands to run."));
    return;
  }

  console.log(chalk.cyan("\n--- Found Commands ---"));
  for (const command of commands) {
    const { shouldRun } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldRun",
        message: `Do you want to run this command? \n  ${chalk.yellow(
          command
        )}`,
        default: false,
      },
    ]);

    if (shouldRun) {
      console.log(chalk.blue(`Executing: ${command}`));
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(chalk.red(`Error executing command: ${error.message}`));
          return;
        }
        if (stderr) {
          console.error(chalk.red(`stderr: ${stderr}`));
          return;
        }
        console.log(chalk.gray(`stdout: \n${stdout}`));
      });
    } else {
      console.log(chalk.gray(`Skipping command: ${command}`));
    }
  }
};
