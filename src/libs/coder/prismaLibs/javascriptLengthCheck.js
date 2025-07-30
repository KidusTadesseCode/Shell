import fs from "fs";
import inquirer from "inquirer";
import chalk from "chalk";

export async function jsLengthCheck(code, potentialPath) {
  if (!fs.existsSync(potentialPath)) return true;
  const currentCode = fs.readFileSync(potentialPath, "utf8");
  const currentLineCount = currentCode.split("\n").length;
  const codeLineCont = code.split("\n").length;

  if (codeLineCont > currentLineCount) {
    return true;
  }

  console.log(chalk.red(`File: ${potentialPath}`));
  console.log(
    chalk.red(
      `The incoming code has ${codeLineCont} lines. The existing code has ${currentLineCount} lines.`
    )
  );
  const { shouldOverwrite } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldOverwrite",
      message: `Do you want to overwrite the existing code?`,
      default: false,
    },
  ]);

  if (shouldOverwrite) {
    return true;
  } else {
    return false;
  }
}
