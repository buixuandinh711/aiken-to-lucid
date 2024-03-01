import jsonpointer from "npm:jsonpointer";
import { AikenType, Field } from "./types.ts";
import { GenType } from "./types.ts";
import { builtInTypes, plutusSchema } from "./const.ts";
import { genTypeToFile, getPointer } from "./utils.ts";
import { ensureDirSync } from "std/fs/mod.ts";

let count = 0;

Object.values(plutusSchema.definitions).forEach((typeDef) => {
  const res = generateType(typeDef as AikenType);
  if (res.type == "custom") {
    const dir = "./out/" + res.path.split("/").slice(0, -1).join("/");
    ensureDirSync(dir);
    Deno.writeTextFileSync(`./out/${res.path}.ts`, genTypeToFile(res));
    count++;
  }
});

function generateType(typeDef: AikenType): GenType {
  const path = typeDef.path;

  if (path in builtInTypes) {
    return builtInTypes[typeDef.path];
  }

  if ("dataType" in typeDef) {
    // console.log(typeDef);
    if (typeDef.dataType == "list" && "items" in typeDef) {
      const listType = jsonpointer.get(
        plutusSchema,
        typeDef.items.$ref.slice(1),
      ) as AikenType;

      const genType = generateType(listType);

      if (genType.type == "primitive") {
        return {
          type: "composite",
          dependencies: new Map(),
          schema: `Data.Array(${genType.schema})`,
        };
      }

      if (genType.type == "composite") {
        return {
          type: "composite",
          dependencies: new Map([...genType.dependencies]),
          schema: `Data.Array(${genType.schema})`,
        };
      }

      if (genType.type == "custom") {
        return {
          type: "composite",
          dependencies: new Map([[genType.name, genType.path]]),
          schema: `Data.Array(${genType.name})`,
        };
      }
    }
    if (typeDef.dataType == "map") {
      return {
        type: "composite",
        dependencies: new Map(),
        schema: `Data.Map(Data.Integer(), Data.Bytes())`,
      };
    }
    if (typeDef.dataType == "constructor" && "fields" in typeDef) {
      const fields = typeDef.fields as Field[];
      const dependencies = new Map();
      const schema: string[] = [];
      fields.forEach((cur) => {
        const listType = getPointer(cur.$ref) as AikenType;
        const genType = generateType(listType);

        if (genType.type == "primitive") {
          schema.push(`${cur.title}: ${genType.schema}`);
          return;
        }

        if (genType.type == "composite") {
          genType.dependencies.forEach((value, key) => {
            dependencies.set(key, value);
          });
          schema.push(`${cur.title}: ${genType.schema}`);
          return;
        }

        if (genType.type == "custom") {
          dependencies.set(genType.name, genType.path);
          schema.push(`${cur.title}: ${genType.name}`);
          return;
        }

        throw new Error("GenType.type not implemented yet");
      });

      return {
        type: "composite",
        dependencies,
        schema: "Data.Object({" + schema.join(",") + "," + "})",
      };
    }
  }

  if ("anyOf" in typeDef) {
    if (typeDef.anyOf.length == 1) {
      const genType = generateType(typeDef.anyOf[0] as unknown as AikenType);

      if (genType.type != "composite") throw new Error("");

      const dependencies = new Map([
        ["Data", "https://deno.land/x/lucid@0.10.7/mod.ts"],
      ]);

      genType.dependencies.forEach((value, key) => {
        dependencies.set(key, value);
      });

      return {
        type: "custom",
        path: typeDef.path,
        name: typeDef.title,
        imports: dependencies,
        schema: genType.schema,
      };
    }
  }

  return { type: "primitive", schema: "===================>" };
}
