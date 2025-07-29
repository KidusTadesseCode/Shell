// src/coder/prismaCoder.js

import { readFileSync, existsSync } from "fs";
import inquirer from "inquirer";
import chalk from "chalk";
import prismaInternals from "@prisma/internals";
import { deepSanityCheck } from "./deepSanityCheck.js";

/**
 * Removes all commands that start with "npx prisma" from the list.
 * @param {string[]} commands - The array of commands to filter.
 * @returns {string[]} A new array with the Prisma commands removed.
 */
function filterPrismaCommands(commands) {
  const filteredCommands = commands.filter(
    (cmd) => !cmd.trim().startsWith("npx prisma")
  );

  if (filteredCommands.length < commands.length) {
    console.log(
      chalk.gray(
        "-> Removing Prisma-related commands due to schema overwrite cancellation."
      )
    );
  }

  return filteredCommands;
}

function displaySanityCheck(sanityCheck) {
  for (const [key, missingItems] of Object.entries(sanityCheck.missing)) {
    for (const item of Object.values(missingItems)) {
      if (key === "enums") {
        if (item.value) {
          const output = `${chalk.red("Enum")} ${chalk.yellow(
            item.name
          )} is missing ${chalk.red(item.value)}.`;
          console.log(output);
        } else {
          const output = `${chalk.red("Enum")} ${chalk.yellow(
            item.name
          )} is missing.`;

          console.log(output);
        }
      }

      if (key === "models") {
        if (item.value) {
          const output = `${chalk.red("Model")} ${chalk.yellow(
            item.name
          )} is missing ${chalk.yellow(item.value)}.`;

          console.log(output);
        } else {
          const output = `${chalk.red("Model")} ${chalk.yellow(
            item.name
          )} is missing.`;

          console.log(output);
        }
      }
    }
  }
}

export async function prismaCoder(files, commands) {
  let updatedFiles = [...files];
  let updatedCommands = [...commands];

  const prismaFile = updatedFiles.find((file) =>
    file.filePath.endsWith("schema.prisma")
  );

  if (!prismaFile) {
    return { filesToDistribute: updatedFiles, commandsToRun: updatedCommands };
  }

  if (!existsSync(prismaFile.filePath)) {
    return { filesToDistribute: updatedFiles, commandsToRun: updatedCommands };
  }

  const existingSchema = readFileSync(prismaFile.filePath, "utf8");
  const incommingSchema = prismaFile.code;

  let incomingDMMF;
  try {
    incomingDMMF = await prismaInternals.getDMMF({
      datamodel: incommingSchema,
      previewFeatures: false,
    });
  } catch (error) {
    console.log(chalk.red("\nError: The incoming Prisma schema is invalid."));
    console.error(chalk.red(error.message));

    const { shouldContinue } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldContinue",
        message:
          "Do you want to continue without the schema check and overwrite the existing schema?",
        default: false,
      },
    ]);

    if (!shouldContinue) {
      console.log(
        chalk.gray("-> Skipped Prisma schema update due to invalid schema.")
      );

      // console.log(updatedFiles);

      updatedFiles = updatedFiles.filter(
        (file) => !file.filePath === "prisma/schema.prisma"
      );
      updatedCommands = filterPrismaCommands(updatedCommands);
    }

    return { filesToDistribute: updatedFiles, commandsToRun: updatedCommands };
  }

  const existingDMMF = await prismaInternals.getDMMF({
    datamodel: existingSchema,
    previewFeatures: false,
  });

  const sanityCheck = deepSanityCheck(existingDMMF, incomingDMMF);

  if (sanityCheck.isMissing === false) {
    return {
      filesToDistribute: updatedFiles,
      commandsToRun: updatedCommands,
    };
  }

  displaySanityCheck(sanityCheck);

  console.log(
    chalk.yellow(`\nWarning: The new Prisma schema has a discrepancy.`)
  );

  const { shouldOverwrite } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldOverwrite",
      message: "Are you sure you want to overwrite the existing schema?",
      default: false,
    },
  ]);

  if (!shouldOverwrite) {
    console.log(chalk.gray("-> Skipped Prisma schema update."));
    updatedFiles = updatedFiles.filter(
      (file) => !file.filePath.endsWith("schema.prisma")
    );
    updatedCommands = filterPrismaCommands(updatedCommands);
  }

  return {
    filesToDistribute: updatedFiles,
    commandsToRun: updatedCommands,
  };
}
