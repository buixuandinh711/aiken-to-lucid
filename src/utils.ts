import jsonpointer from "npm:jsonpointer";
import { AikenType } from "./types.ts";
import { plutusSchema } from "./const.ts";
import { GenType, ImportMap } from "./types.ts";
import * as path from "std/path/mod.ts";

export function getPointer(ref: string): AikenType {
  return jsonpointer.get(plutusSchema, ref.slice(1));
}

export function genTypeToFile(
  genType: Extract<GenType, { type: "custom" }>,
): string {
  return generateImports(genType.imports) + "\n\n" +
    generateFileContent(genType.name, genType.schema);
}

function generateImports(importMap: ImportMap): string {
  let importLines = "";
  importMap.forEach((path, content) => {
    importLines += `import { ${content} } from "${path}";\n`;
  });
  return importLines;
}

function generateFileContent(name: string, schema: string): string {
  return `export const ${name}Schema = ${schema};\n` +
    `export type ${name} = Data.Static<typeof ${name}Schema>;\n` +
    `export const ${name} = ${name}Schema as unknown as ${name};\n`;
}
