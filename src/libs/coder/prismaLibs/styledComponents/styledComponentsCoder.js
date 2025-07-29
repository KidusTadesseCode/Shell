import { readFileSync, existsSync } from "fs";
import inquirer from "inquirer";
import { parse } from "@babel/parser";
import traverseNS from "@babel/traverse";
const traverse = traverseNS.default;

function getExportCount(code) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx"], // add others if needed
  });

  let count = 0;
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const { declaration, specifiers } = path.node;
      if (declaration?.type === "VariableDeclaration") {
        count += declaration.declarations.length;
      }
      if (
        declaration &&
        (declaration.type === "FunctionDeclaration" ||
          declaration.type === "ClassDeclaration")
      ) {
        count += 1;
      }
      count += specifiers.length;
    },
  });

  return count;
}

export async function styledComponentsCoder(code, potentialPath) {
  if (!existsSync(potentialPath)) {
    console.log("No potential path found.");
    return true;
  }
  const currentCode = readFileSync(potentialPath, "utf8");
  const currentCodeCount = getExportCount(currentCode);
  const incomingCodeCount = getExportCount(code);
  if (incomingCodeCount >= currentCodeCount) return true;
  console.log(potentialPath);
  const { shouldContinue } = await inquirer.prompt([
    {
      type: "confirm",
      name: "shouldContinues",
      message: `The incoming code has ${incomingCodeCount} exports, while the current code has ${currentCodeCount} exports. Do you want to continue?`,
      default: false,
    },
  ]);

  if (!shouldContinue) return false;
  return true;
}
