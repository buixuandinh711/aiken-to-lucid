import blueprint from "../plutus.json" with { type: "json" };
import { GenType } from "./types.ts";

// deno-lint-ignore no-explicit-any
delete (blueprint.definitions as any)["Void"];

// deno-lint-ignore no-explicit-any
(blueprint.definitions as any)["aiken/math/rational/Rational"] = {
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

Object.entries(blueprint.definitions).forEach(([key]) =>
  // deno-lint-ignore no-explicit-any
  (blueprint.definitions as any)[key].path = key
);

export const plutusSchema = blueprint;

export const builtInTypes: { [type: string]: GenType } = {
  Bool: {
    type: "primitive",
    schema: "Data.Boolean()",
  },
  ByteArray: {
    type: "primitive",

    schema: "Data.Bytes()",
  },
  Data: {
    type: "primitive",

    schema: "Data.Any()",
  },
  Int: {
    type: "primitive",

    schema: "Data.Integer()",
  },
} as const;
