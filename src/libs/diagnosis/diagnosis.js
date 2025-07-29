// src/lib/file/diagnosis
import fs from "fs";
import path from "path";

// This is a temporary function to write files to the temp directory
export function diagnosis(fileName, content, extension) {
  try {
    if (!content) throw new Error("No content provided");
    if (!fileName) throw new Error("No file name provided");
    const contentType = typeof content;
    let ext;
    if (extension) {
      if (extension[0] === ".") ext = extension;
      else ext = `.${extension}`;
    } else ext = contentType === "object" ? ".json" : ".txt";
    // if the content is an object, convert it to JSON
    const fileContent =
      contentType === "object" ? JSON.stringify(content, null, 2) : content;
    const filename = `${fileName}${ext}`;
    const tempFilesDir = path.join(process.cwd(), "Temp");
    if (!fs.existsSync(tempFilesDir)) fs.mkdirSync(tempFilesDir);
    const dir = path.join(tempFilesDir, filename);
    fs.writeFileSync(dir, fileContent);
    console.log("dir", dir);
    return;
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
}
