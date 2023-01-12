require("./svelte-detective.polyfill");

const madge = require("madge");
const path = require("path");

const svelteProject = path.normalize(path.join(process.cwd(), "..", "blog"));

const main = async () => {
  const tree = await madge(svelteProject, {
    fileExtensions: ["ts", "svelte"],
  });

  console.log(tree.obj());
};

main();
