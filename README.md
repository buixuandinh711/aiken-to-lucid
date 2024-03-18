# A simple project to convert [Aiken](https://aiken-lang.org/) types into [Lucid](https://lucid.spacebudz.io/) types.
*NOTE:* This project is written and run on [Deno](https://deno.com/), make sure you have Deno installed and `.deno/` added to `PATH` [environment variable ](https://github.com/alexal1/Insomniac/wiki/Adding-platform-tools-to-the-PATH-environment-variable).
### Install
Clone this repo and `cd` to it, then run:
```bash
deno install --allow-read --allow-write --allow-run="deno" -n juken src/main.ts
```

Or install directly from [deno.land](https://deno.land/x/juken)
```bash
deno install --allow-read --allow-write --allow-run="deno" -n juken https://deno.land/x/juken/src/mod.ts
```

This will install a Deno executable package named `juken` to your machine.

**Permissions:** this package need these permissions:
- **Read:** for reading `plutus.json` file.
- **Write:** for writing generated files to output directory.
- **Run:** for running `deno fmt` after files generated.
### Usage
```bash
juken [--in-file path_to_plutus.json] [--out-dir path_to_out_dir]
```
### More info
```bash
juken --help
```