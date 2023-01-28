const precinct = require("precinct");
const compiler = require("svelte/compiler");
const fs = require("fs");
const path = require("path");
const cabinet = require("filing-cabinet");

const debug = require("debug")("svelte-madge polyfill");

function decoratePrecinct() {
  const old = precinct.paperwork;

  if (!old._old) {
    precinct.paperwork = function (filename, options) {
      const ext = path.extname(filename);
      let newOptions = options;

      if (newOptions.fileSystem && newOptions.fileSystem._svelte) {
        console.info(`log old`);
        delete newOptions.fileSystem;
      }

      let newFilename = filename;

      if (ext === ".svelte") {
        newFilename = filename.replace(/\.svelte$/, ".jsx");

        newOptions = {
          ...options,
          fileSystem: {
            readFileSync() {
              const originStr = fs.readFileSync(filename, "utf8");
              delete newOptions.fileSystem;

              return compiler.parse(originStr).instance.content;
            },
          },
        };
        newOptions.fileSystem._svelte = true;
      }

      return old.call(this, newFilename, newOptions);
    };
  }

  precinct.paperwork._old = old;
}

function configCabinet() {
  let webpackResolve;

  const isRelative = require("is-relative-path");

  function stripLoader(dependency) {
    const exclamationLocation = dependency.indexOf("!");

    if (exclamationLocation === -1) return dependency;

    return dependency.slice(exclamationLocation + 1);
  }

  function resolveWebpackPath({
    dependency,
    filename,
    directory,
    webpackConfig,
  }) {
    if (!webpackResolve) webpackResolve = require("enhanced-resolve");

    webpackConfig = path.resolve(webpackConfig);
    let loadedConfig;

    try {
      loadedConfig = require(webpackConfig);

      if (typeof loadedConfig === "function") {
      }
    } catch (error) {
      debug("error loading the webpack config at", webpackConfig);
      debug(e.message);
      debug(e.stack);
      return "";
    }

    const resolveConfig = Object.assign({}, loadedConfig.resolve);

    if (
      !resolveConfig.modules &&
      (resolveConfig.root || resolveConfig.modulesDirectories)
    ) {
      resolveConfig.modules = [];

      if (resolveConfig.root) {
        resolveConfig.modules = resolveConfig.modules.concat(
          resolveConfig.root
        );
      }

      if (resolveConfig.modulesDirectories) {
        resolveConfig.modules = resolveConfig.modules.concat(
          resolveConfig.modulesDirectories
        );
      }
    }

    try {
      const resolver = webpackResolve.create.sync(resolveConfig);
      dependency = stripLoader(dependency);
      const lookupPath = isRelative(dependency)
        ? path.dirname(filename)
        : directory;
      return resolver(lookupPath, dependency);
    } catch (e) {
      debug("error when resolving " + dependency);
      debug(e.message);
      debug(e.stack);
      return "";
    }
  }

  function svelteLookup({
    dependency,
    filename,
    directory,
    config,
    webpackConfig,
    configPath,
    nodeModulesConfig,
    ast,
  }) {
    const type = cabinet._getJSType({
      config,
      webpackConfig,
      filename,
      ast,
    });

    switch (type) {
      case "webpack":
        debug("using webpack resolver for es6");
        return resolveWebpackPath({
          dependency,
          filename,
          directory,
          webpackConfig,
        });
      case "amd":
      case "commonjs":
      case "es6":
      default:
        throw new Error("only webpack");
    }
  }

  cabinet.register(".svelte", svelteLookup);
}

decoratePrecinct();
configCabinet();
