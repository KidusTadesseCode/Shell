// src/command-runner.js
import inquirer from "inquirer";
import { exec } from "child_process";
import chalk from "chalk";

/**
 * Wraps the callback-based `exec` function in a Promise.
 * @param {string} command The command to execute.
 * @returns {Promise<{stdout: string, stderr: string}>} A promise that resolves with stdout and stderr.
 */
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Reject the promise if the command fails
        reject({ error, stdout, stderr });
        return;
      }
      // Resolve the promise on successful execution
      resolve({ stdout, stderr });
    });
  });
};

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
      console.log(chalk.blue(`\n-> Executing: ${command}`));
      try {
        // Await the promise-wrapped exec function
        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
          // Log standard error, but don't treat it as a failure
          console.error(chalk.yellow(`stderr: \n${stderr}`));
        }
        if (stdout) {
          console.log(chalk.gray(`stdout: \n${stdout}`));
        }
        console.log(chalk.green("-> Command finished successfully.\n"));
      } catch (e) {
        // This block runs if the command returns a non-zero exit code
        console.error(
          chalk.red(`-> Error executing command: ${e.error.message}`)
        );
        if (e.stderr) {
          console.error(chalk.red(`stderr: \n${e.stderr}`));
        }
        if (e.stdout) {
          console.log(chalk.gray(`stdout: \n${e.stdout}`));
        }
        console.log(
          chalk.red("\n-> Command failed. Skipping subsequent commands.")
        );
        // Exit the loop so subsequent commands are not run
        break;
      }
    } else {
      console.log(chalk.gray("-> Skipped.\n"));
    }
  }
};
