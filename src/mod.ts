import jsonpointer from "npm:jsonpointer";
import { AikenType } from "./types.ts";
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
  } else {
    // console.log(res.schema);
  }
});

console.log(
  Object.values(plutusSchema.definitions).length,
);
console.log(`Generated ${count} files`);

function generateType(typeDef: AikenType): GenType {
  const path = typeDef.path;

  if (path in builtInTypes) {
    return builtInTypes[typeDef.path];
  }

  if ("dataType" in typeDef) {
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
          schema: `Data.Array(${genType.name}Schema)`,
        };
      }
    }

    if (typeDef.dataType == "map" && "keys" in typeDef && "values" in typeDef) {
      const keyType = jsonpointer.get(
        plutusSchema,
        typeDef.keys.$ref.slice(1),
      ) as AikenType;
      const genKeyType = generateType(keyType);

      const dependencies = new Map();
      let keySchema: string;

      if (genKeyType.type === "primitive") {
        keySchema = genKeyType.schema;
      } else if (genKeyType.type === "composite") {
        genKeyType.dependencies.forEach((value, key) => {
          dependencies.set(key, value);
        });
        keySchema = genKeyType.schema;
      } else if (genKeyType.type === "custom") {
        dependencies.set(genKeyType.name, genKeyType.path);
        keySchema = `${genKeyType.name}Schema`;
      } else {
        throw new Error("map.key GenType.type not implemented yet");
      }

      const valType = jsonpointer.get(
        plutusSchema,
        typeDef.values.$ref.slice(1),
      ) as AikenType;
      const genValType = generateType(valType);
      let valSchema: string;

      if (genValType.type === "primitive") {
        valSchema = genValType.schema;
      } else if (genValType.type === "composite") {
        genValType.dependencies.forEach((value, key) => {
          dependencies.set(key, value);
        });
        valSchema = genValType.schema;
      } else if (genValType.type === "custom") {
        dependencies.set(genValType.name, genValType.path);
        valSchema = `${genValType.name}Schema`;
      } else {
        throw new Error("map.value GenType.type not implemented yet");
      }

      return {
        type: "composite",
        dependencies,
        schema: `Data.Map(${keySchema}, ${valSchema})`,
      };
    }

    if (typeDef.dataType == "constructor" && "fields" in typeDef) {
      const fields = typeDef.fields as {
        $ref: string;
      }[];

      if (fields.length > 0) {
        if ("title" in fields[0]) {
          const objectFields = fields as {
            $ref: string;
            title: string;
          }[];

          const dependencies = new Map();
          const schema: string[] = [];
          objectFields.forEach((cur) => {
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
              schema.push(`${cur.title}: ${genType.name}Schema`);
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
    }
  }

  if ("anyOf" in typeDef) {
    if (typeDef.anyOf.length == 1) {
      const genType = generateType(typeDef.anyOf[0] as unknown as AikenType);

      if (genType.type != "composite") {
        throw new Error("GenType.type must be composite");
      }

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
    } else {
      const dependencies = new Map([
        ["Data", "https://deno.land/x/lucid@0.10.7/mod.ts"],
      ]);
      const schema: string[] = [];

      typeDef.anyOf.forEach((t) => {
        if (!("title" in t)) throw new Error("Enum variant title not found");

        const genType = generateType(t as unknown as AikenType);

        if (genType.type === "primitive") {
          schema.push(`Data.Literal("${t.title}")`);
        } else if (genType.type === "composite") {
          genType.dependencies.forEach((value, key) => {
            dependencies.set(key, value);
          });

          schema.push(
            `Data.Object({${t.title}: ${genType.schema},})`,
          );
        } else {
          throw new Error(
            `Enum variant ${t.title} GenType.type ${genType.type} ${genType.schema} not implemented yet`,
          );
        }
      });

      return {
        type: "custom",
        path: typeDef.path,
        name: typeDef.title,
        imports: dependencies,
        schema: `Data.Enum([${schema.join(", ")}]);`,
      };
    }
  }

  return { type: "primitive", schema: "===================>" };
}
