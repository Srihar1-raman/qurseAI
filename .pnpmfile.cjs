// Remove canvas from all dependencies to prevent build errors
function readPackage(pkg) {
  const removeCanvas = (deps) => {
    if (!deps) return deps;
    const newDeps = { ...deps };
    delete newDeps.canvas;
    delete newDeps['@napi-rs/canvas'];
    delete newDeps['napi-rs/canvas'];
    delete newDeps['vega-canvas'];
    return newDeps;
  };

  return {
    ...pkg,
    dependencies: removeCanvas(pkg.dependencies),
    devDependencies: removeCanvas(pkg.devDependencies),
    optionalDependencies: removeCanvas(pkg.optionalDependencies),
    peerDependencies: removeCanvas(pkg.peerDependencies),
  };
}

module.exports = {
  hooks: {
    readPackage,
  },
};
