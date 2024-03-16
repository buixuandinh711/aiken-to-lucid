import jsonpointer from "npm:jsonpointer";
import { AikenType } from "./types.ts";
import { GenType, ImportMap } from "./types.ts";
import * as path from "std/path/mod.ts";
import { PlutusDefinition } from "./types.ts";

export function getPointer(
  plutusDefinition: PlutusDefinition,
  ref: string,
): AikenType {
  return jsonpointer.get(plutusDefinition, ref.slice(13));
}

export function genTypeToFile(
  genType: Extract<GenType, { type: "custom" }>,
): string {
  return generateImports(genType.imports, extractPath(genType.path).dir) +
    "\n" +
    generateFileContent(genType.name, genType.schema);
}

function generateImports(importMap: ImportMap, basePath: string): string {
  let importLines = "";
  importMap.forEach((importPath, content) => {
    if (content != "Data") {
      const { dir, name } = extractPath(importPath);
      let relativePath = path.relative(basePath, dir) + "/";
      if (relativePath.length == 1) {
        relativePath = "./";
      }
      importLines += `import { ${content}Schema } from "${
        relativePath + name
      }.ts";\n`;
    } else {
      importLines += `import { ${content} } from "${importPath}";\n`;
    }
  });
  return importLines;
}

function generateFileContent(name: string, schema: string): string {
  return `export const ${name}Schema = ${schema};\n` +
    `export type ${name} = Data.Static<typeof ${name}Schema>;\n` +
    `export const ${name} = ${name}Schema as unknown as ${name};\n`;
}

function extractPath(p: string) {
  const segments = p.split("/");
  return {
    dir: segments.slice(0, -1).join("/"),
    name: segments.slice(-1)[0],
  };
}

export function insertDependencies(
  baseDeps: ImportMap,
  newDeps: ImportMap,
  newSchema: string[],
): [ImportMap, string[]] {
  const updatedDeps = new Map([...baseDeps]);
  const updatedSchema = [...newSchema];

  for (const [importId, importContent] of newDeps) {
    const foundContent = updatedDeps.get(importId);

    if (foundContent != undefined) {
      if (JSON.stringify(foundContent) == JSON.stringify(importContent)) {
        continue;
      } else {
        const postfixedImportId = importId + "z";
        updatedDeps.set(postfixedImportId, importContent);
        updatedSchema.forEach((item, index) => {
          if (item === importId) {
            updatedSchema[index] = postfixedImportId;
          }
        });
      }
    } else {
      updatedDeps.set(importId, importContent);
    }
  }

  return [updatedDeps, updatedSchema];
}
