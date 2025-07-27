// src/file-writer.js
import fs from "fs";
import path from "path";
import chalk from "chalk";

const addCommentToTopOfFile = (filePath, code) => {
  const ext = path.extname(filePath);
  if ([".js", ".mjs", ".prisma"].includes(ext)) {
    return `// ${filePath}\n\n${code}`;
  }
  return code;
};

export const writeFiles = (files) => {
  const createdFiles = [];
  files.forEach(({ filePath, code }) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = addCommentToTopOfFile(filePath, code);
      fs.writeFileSync(filePath, content);
      createdFiles.push(filePath);
      console.log(chalk.green(`Successfully created/updated: ${filePath}`));
    } catch (error) {
      console.error(chalk.red(`Error writing file ${filePath}:`), error);
    }
  });
  return createdFiles;
};
