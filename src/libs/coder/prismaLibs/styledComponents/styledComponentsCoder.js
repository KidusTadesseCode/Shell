import { readFileSync, existsSync } from "fs";
import inquirer from "inquirer";
import { parse } from "@babel/parser";
import traverseNS from "@babel/traverse";
import chalk from "chalk";

// Babel's default export is under the 'default' property when using ES modules
const traverse = traverseNS.default;

/**
 * Parses the given code to extract the names of all named exports.
 * This is used to identify the list of components in a styled-components file.
 * @param {string} code The JavaScript code to parse.
 * @returns {string[]} An array of exported component names.
 */
function getExportedComponentNames(code) {
  const names = new Set();
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"], // Enable JSX parsing
    });

    traverse(ast, {
      ExportNamedDeclaration(path) {
        // Handles `export const MyComponent = ...`
        if (path.node.declaration && path.node.declaration.declarations) {
          path.node.declaration.declarations.forEach((declaration) => {
            if (declaration.id.type === "Identifier") {
              names.add(declaration.id.name);
            }
          });
        }
        // Handles `export { MyComponent, AnotherComponent }`
        if (path.node.specifiers) {
          path.node.specifiers.forEach((specifier) => {
            if (specifier.exported.type === "Identifier") {
              names.add(specifier.exported.name);
            }
          });
        }
      },
    });
  } catch (error) {
    console.error(chalk.red("Failed to parse JavaScript code:"), error);
  }
  return [...names];
}

/**
 * Extracts the full source code for a list of specified components.
 * It finds the `export const ComponentName = styled...` block and captures it until the closing backtick.
 * @param {string} code The full source code to search within.
 * @param {string[]} componentNames The names of components to extract.
 * @returns {string[]} An array containing the source code for each found component.
 */
function getComponentsCode(code, componentNames) {
  const lines = code.split("\n");
  const componentCodes = [];

  componentNames.forEach((name) => {
    const startIndex = lines.findIndex((line) =>
      line.includes(`export const ${name}`)
    );

    if (startIndex !== -1) {
      // Find the end of the styled-component definition (the closing backtick)
      let endIndex = -1;
      let openBackticks = 0;
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes("`")) {
          openBackticks++;
        }
        if (openBackticks > 0 && lines[i].includes("`")) {
          // This is a naive check; a better implementation would count opening/closing backticks
          if (i > startIndex || lines[startIndex].split("`").length > 2) {
            endIndex = i;
            break;
          }
        }
      }
      // A simple fallback if the above logic fails
      if (endIndex === -1) {
        endIndex = lines.findIndex(
          (line, index) => index > startIndex && line.includes("`;")
        );
      }

      if (endIndex !== -1) {
        const componentCode = lines.slice(startIndex, endIndex + 1).join("\n");
        componentCodes.push(componentCode);
      }
    }
  });

  return componentCodes;
}

/**
 * Intelligently handles updates to styled-components files.
 * It can cherry-pick new components or warn the user about destructive overwrites.
 * @param {string} incomingCode The new code from the markdown file.
 * @param {string} potentialPath The path to the file that might be overwritten.
 * @returns {Promise<{continue: boolean, code: string|null}>} An object indicating whether to proceed and the final code to write.
 */
export async function styledComponentsCoder(incomingCode, potentialPath) {
  // If the target file doesn't exist, it's a new file. No need to merge.
  if (!existsSync(potentialPath)) {
    console.log(
      chalk.blue(`-> File ${potentialPath} does not exist. It will be created.`)
    );
    return { continue: true, code: incomingCode };
  }

  const currentCode = readFileSync(potentialPath, "utf8");

  const currentComponents = getExportedComponentNames(currentCode);
  const incomingComponents = getExportedComponentNames(incomingCode);

  // Find which components are new (in incoming but not in current)
  const newComponents = incomingComponents.filter(
    (c) => !currentComponents.includes(c)
  );

  // Find which components would be removed (in current but not in incoming)
  const removedComponents = currentComponents.filter(
    (c) => !incomingComponents.includes(c)
  );

  // --- Scenario 1: New components detected ---
  // This is the ideal case: non-destructive addition of new components.
  if (newComponents.length > 0) {
    console.log(
      chalk.green(
        `-> Found ${newComponents.length} new component(s) for ${potentialPath}:`
      )
    );
    newComponents.forEach((c) => console.log(chalk.cyan(`  - ${c}`)));

    const newCodeSnippets = getComponentsCode(incomingCode, newComponents);
    const finalCode = `${currentCode}\n\n${newCodeSnippets.join("\n\n")}`;

    console.log(
      chalk.blue("-> Merging new components into the existing file.")
    );
    return { continue: true, code: finalCode };
  }

  // --- Scenario 2: Components would be removed ---
  // This is a potentially destructive action, so we must ask the user.
  if (removedComponents.length > 0) {
    console.log(
      chalk.yellow(
        `\nWarning: Overwriting ${potentialPath} will remove ${removedComponents.length} component(s):`
      )
    );
    removedComponents.forEach((c) => console.log(chalk.red(`  - ${c}`)));

    const { shouldOverwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldOverwrite",
        message: `Are you sure you want to proceed and overwrite the file?`,
        default: false,
      },
    ]);

    if (shouldOverwrite) {
      console.log(chalk.gray("-> User approved overwrite."));
      return { continue: true, code: incomingCode };
    } else {
      console.log(chalk.gray("-> Skipped file update."));
      return { continue: false, code: null };
    }
  }

  // --- Scenario 3: No new or removed components ---
  // This means the update is likely just changing styles inside existing components.
  // We can proceed without any special action.
  console.log(
    chalk.gray(
      `-> No new or removed components in ${potentialPath}. Proceeding with update.`
    )
  );
  return { continue: true, code: incomingCode };
}
