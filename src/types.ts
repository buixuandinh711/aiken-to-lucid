import blueprint from "../plutus.json" with { type: "json" };

export type AikenType =
  & typeof blueprint.definitions[keyof typeof blueprint.definitions]
  & { path: string };

export type Field = {
  "title": string;
  "$ref": string;
};

export type ImportMap = Map<string, string>;

export type GenType = {
  type: "custom";
  path: string;
  imports: ImportMap;
  name: string;
  schema: string;
} | {
  type: "primitive";
  schema: string;
} | {
  type: "composite";
  dependencies: ImportMap;
  schema: string;
};
