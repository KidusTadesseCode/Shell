// src/file-parser.js
import { marked } from "marked";
import fs from "fs";
import { prismaCoder } from "./libs/coder/prismaLibs/prismaCoder.js";
import { styledComponentsCoder } from "./libs/coder/prismaLibs/styledComponents/styledComponentscoder.js";
// Define languages that are for file content
const fileContentLangs = ["javascript", "js", "prisma", "json", "sql", "css"];
const blacklistFiles = [
  "src/components/layout/AppHeader.js",
  "src/components/auth/UserMenu.js",
  "src/styles/theme.js",
];

export async function parseMarkdown(filePath) {
  const markdown = fs.readFileSync(filePath, "utf8");
  const tokens = marked.lexer(markdown, { gfm: true });
  const filesToDistribute = [];
  const commandsToRun = [];

  for (let i = 0; i < tokens.length; i++) {
    const currentToken = tokens[i];

    if (currentToken.type === "code") {
      const lang = currentToken.lang?.toLowerCase();
      const code = currentToken.text;

      // Define languages for executable commands
      const commandLangs = ["shell", "bash"];

      if (fileContentLangs.includes(lang)) {
        // The filepath should be in the token immediately preceding the code block.
        const prevToken = tokens[i];
        // We expect the previous token to be a 'paragraph' containing the file path.
        if (prevToken && prevToken.type === "code") {
          const potentialPath = prevToken.text
            .trim()
            .split("\n")[0]
            .replace("// ", "");
          if (
            potentialPath &&
            !potentialPath.includes(" ") &&
            (potentialPath.includes("/") || potentialPath.includes("."))
          ) {
            // Check if the file should be ignored
            if (blacklistFiles.includes(potentialPath)) {
              continue;
            }

            if (lang === "javascript" || lang === "js") {
              const check = ` from "styled-components"`;
              const splitCode = code.split("\n");
              const isStyled = splitCode.some((line) => line.includes(check));
              if (isStyled) {
                const checkStyledCode = await styledComponentsCoder(
                  code,
                  potentialPath
                );
                if (checkStyledCode === false) continue;
                filesToDistribute.push({ filePath: potentialPath, code });
                continue;
              }
            }

            filesToDistribute.push({ filePath: potentialPath, code });
            // Continue to the next token since we've processed this block
            continue;
          }
        }
      }

      if (commandLangs.includes(lang)) {
        commandsToRun.push(code);
      }
    }
  }

  // const result = await prismaCoder(filesToDistribute, commandsToRun);
  return { filesToDistribute, commandsToRun };
}
