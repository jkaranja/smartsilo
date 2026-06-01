import { parseArgs } from "util";
import { addAdmin } from "./admin";

const {
  positionals: [cmd, ...args],
} = parseArgs({ allowPositionals: true });

const commands = ["add-admin"];

switch (cmd) {
  case "add-admin":
    await addAdmin(args);
    break;

  default: {
    console.log(`available commands:\n    ${commands.join("\n    ")}`);
  }
}
