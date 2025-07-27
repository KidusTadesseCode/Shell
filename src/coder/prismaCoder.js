// src/coder/prismaCoder.js
import fs from "fs";
import inquirer from "inquirer";
import chalk from "chalk";

export async function prismaCoder(files) {
  const prismaFile = files.find((file) =>
    file.filePath.endsWith("prisma.schema")
  );

  if (!prismaFile) {
    return files; // No prisma file to process
  }

  if (!fs.existsSync(prismaFile.filePath)) {
    return files; // The prisma file does not exist yet
  }

  const existingSchema = fs.readFileSync(prismaFile.filePath, "utf8");
  const existingLines = existingSchema.split("\n").length;
  const newLines = prismaFile.code.split("\n").length;
  const difference = Math.abs(existingLines - newLines);

  // Define "significant" as a difference of 25 lines or more
  if (difference > 25) {
    console.log(
      chalk.yellow(
        `Warning: The new Prisma schema has a significant line difference (${difference} lines) from the existing one.`
      )
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
      // Remove the prisma file from the distribution list
      return files.filter((file) => !file.filePath.endsWith("prisma.schema"));
    }
  }

  return files;
}
