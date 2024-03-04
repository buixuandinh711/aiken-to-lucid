# A simple project to convert [Aiken](https://aiken-lang.org/) types into [Lucid](https://lucid.spacebudz.io/) types.
*NOTE:* This project is written and run on [Deno](https://deno.com/), make sure you have Deno installed and `.deno/` added to `PATH` [environment variable ](https://github.com/alexal1/Insomniac/wiki/Adding-platform-tools-to-the-PATH-environment-variable).
### Install
Clone this repo and `cd` to it, then run:
```bash
deno install --allow-read --allow-write --allow-run="deno" -n aikid --import-map deno.json src/main.ts
```
This will install a Deno executable package named `aikid` to your machine.

**Permissions:** this package need these permissions:
- **Read:** for reading `plutus.json` file.
- **Write:** for writing generated files to output directory.
- **Run:** for running `deno fmt` after files generated.
### Usage
```bash
aikid [--in-file path_to_plutus.json] [--out-dir path_to_out_dir]
```
### More info
```bash
aikid --help
```