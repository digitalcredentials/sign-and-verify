import { build } from './app'
import { getConfig } from "./config";

const { port } = getConfig();

const run = async () => {
  const server = await build({
    logger: true
  });

  server.listen(port, '::', (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
};

run();