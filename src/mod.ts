import { AikenType } from "./types.ts";
import { GenType } from "./types.ts";
import { builtInTypes } from "./const.ts";
import { getPointer } from "./utils.ts";
import { PlutusDefinition } from "./types.ts";

export function generateType(
  plutusDefinition: PlutusDefinition,
  typeDef: AikenType,
): GenType {
  const path = typeDef.path;

  if (path in builtInTypes) {
    return builtInTypes[typeDef.path];
  }

  if ("dataType" in typeDef) {
    if (typeDef.dataType == "list" && "items" in typeDef) {
      const listType = getPointer(
        plutusDefinition,
        typeDef.items.$ref,
      );

      const genType = generateType(plutusDefinition, listType);

      if (genType.type === "primitive") {
        return {
          type: "composite",
          dependencies: new Map(),
          schema: `Data.Array(${genType.schema})`,
        };
      } else if (genType.type === "composite") {
        return {
          type: "composite",
          dependencies: new Map([...genType.dependencies]),
          schema: `Data.Array(${genType.schema})`,
        };
      } else if (genType.type === "custom") {
        return {
          type: "composite",
          dependencies: new Map([[genType.name, genType.path]]),
          schema: `Data.Array(${genType.name}Schema)`,
        };
      } else {
        throw new Error("list.item GenType.type not implemented yet");
      }
    }

    if (typeDef.dataType == "map" && "keys" in typeDef && "values" in typeDef) {
      const keyType = getPointer(plutusDefinition, typeDef.keys.$ref);
      const genKeyType = generateType(plutusDefinition, keyType);

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

      const valType = getPointer(plutusDefinition, typeDef.values.$ref);
      const genValType = generateType(plutusDefinition, valType);
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
          const dependencies = new Map();
          const schema: string[] = [];

          fields.forEach((cur) => {
            if (!("title" in cur)) {
              throw new Error("title can not be undefined in Object field");
            }

            const listType = getPointer(plutusDefinition, cur.$ref);
            const genType = generateType(plutusDefinition, listType);

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
        } else {
          const dependencies = new Map();
          const schema: string[] = [];

          fields.forEach((cur) => {
            const listType = getPointer(plutusDefinition, cur.$ref);
            const genType = generateType(plutusDefinition, listType);

            if (genType.type === "primitive") {
              schema.push(genType.schema);
            } else if (genType.type === "composite") {
              genType.dependencies.forEach((value, key) => {
                dependencies.set(key, value);
              });
              schema.push(genType.schema);
            } else if (genType.type === "custom") {
              dependencies.set(genType.name, genType.path);
              schema.push(`${genType.name}Schema`);
            } else {
              throw new Error("GenType.type not implemented yet");
            }
          });

          return {
            type: "composite",
            dependencies,
            schema: `Data.Tuple([${schema.join(", ")}])`,
          };
        }
      } else {
        if (!("title" in typeDef)) {
          throw new Error("title can not be undefined with Literal");
        }

        return {
          type: "primitive",
          schema: `Data.Literal("${typeDef.title}")`,
        };
      }
    }
  }

  if ("anyOf" in typeDef) {
    if (typeDef.anyOf.length == 1) {
      const genType = generateType(
        plutusDefinition,
        typeDef.anyOf[0] as unknown as AikenType,
      );

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
    } else if (typeDef.title === "Optional" && typeDef.anyOf.length == 2) {
      const someDef = typeDef.anyOf[0];

      if (
        someDef.dataType !== "constructor" || !("title" in someDef) ||
        someDef.title != "Some" || someDef.fields.length !== 1
      ) {
        throw new Error("Invalid type definition for Option.Some ");
      }

      const someType = getPointer(
        plutusDefinition,
        typeDef.anyOf[0].fields[0].$ref,
      );
      const genType = generateType(plutusDefinition, someType);

      if (genType.type === "primitive") {
        return {
          type: "composite",
          dependencies: new Map(),
          schema: `Data.Nullable(${genType.schema})`,
        };
      } else if (genType.type === "composite") {
        return {
          type: "composite",
          dependencies: new Map([...genType.dependencies]),
          schema: `Data.Nullable(${genType.schema})`,
        };
      } else if (genType.type === "custom") {
        return {
          type: "composite",
          dependencies: new Map([[genType.name, genType.path]]),
          schema: `Data.Nullable(${genType.name}Schema)`,
        };
      } else {
        throw new Error("Option.Some.value GenType.type not implemented yet");
      }
    } else {
      const dependencies = new Map([
        ["Data", "https://deno.land/x/lucid@0.10.7/mod.ts"],
      ]);
      const schema: string[] = [];

      typeDef.anyOf.forEach((t) => {
        if (!("title" in t)) {
          throw new Error(`Enum ${typeDef.title} variant title not found`);
        }

        const genType = generateType(
          plutusDefinition,
          t as unknown as AikenType,
        );

        if (genType.type === "primitive") {
          schema.push(genType.schema);
        } else if (genType.type === "composite") {
          genType.dependencies.forEach((value, key) => {
            dependencies.set(key, value);
          });

          schema.push(
            `Data.Object({${t.title}: ${genType.schema},})`,
          );
        } else {
          throw new Error(
            `Enum variant ${t.title} GenType.type ${genType.type} not implemented yet`,
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

  throw new Error("Type is not recognized");
}
