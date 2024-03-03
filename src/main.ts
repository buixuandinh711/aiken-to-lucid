import { Command } from "cliffy/command/mod.ts";
import { AikenType, PlutusDefinition } from "./types.ts";
import { generateType } from "./mod.ts";
import { ensureDirSync } from "std/fs/mod.ts";
import { genTypeToFile } from "./utils.ts";

async function main() {
  await (new Command()
    .name("aikid")
    .version("0.1.0")
    .description("Generate Aiken types for Lucid")
    .option("-i, --in-file <path:string>", "Path to plutus.json file", {
      default: "./plutus.json",
    })
    .option(
      "-o, --out-dir <path:string>",
      "Output directory for generated files",
      {
        default: "./lucid-types",
      },
    )
    .action(({ inFile, outDir }) => {
      const plutusFile = JSON.parse(Deno.readTextFileSync(inFile));
      plutusFile.definitions["aiken/math/rational/Rational"] = {
        "title": "Rational",
        "anyOf": [
          {
            "title": "Rational",
            "dataType": "constructor",
            "index": 0,
            "fields": [
              {
                "title": "numerator",
                "$ref": "#/definitions/Int",
              },
              {
                "title": "denominator",
                "$ref": "#/definitions/Int",
              },
            ],
          },
        ],
      };
      Object.entries(plutusFile.definitions).forEach(([key]) =>
        plutusFile.definitions[key].path = key
      );
      const plutusDefinition: PlutusDefinition = plutusFile.definitions;

      let count = 0;

      Object.values(plutusDefinition).forEach((typeDef) => {
        const res = generateType(plutusDefinition, typeDef as AikenType);
        if (res.type == "custom") {
          const dir = `${outDir}/` +
            res.path.split("/").slice(0, -1).join("/");
          ensureDirSync(dir);
          Deno.writeTextFileSync(
            `${outDir}/${res.path}.ts`,
            genTypeToFile(res),
          );
          count++;
        }
      });

      const command = new Deno.Command(Deno.execPath(), {
        args: ["fmt", outDir],
      });
      command.outputSync();

      console.log(`Generated ${count} files`);
      console.log(`Files saved to ${outDir}/`);
    })
    .parse(Deno.args));
}

if (import.meta.main) {
  await main();
}
