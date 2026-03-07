// Remove canvas from all dependencies to prevent build errors
function readPackage(pkg) {
  const removeCanvas = (deps) => {
    if (!deps) return deps;
    const newDeps = { ...deps };
    delete newDeps.canvas;
    delete newDeps['@napi-rs/canvas'];
    delete newDeps['napi-rs/canvas'];
    // Note: vega-canvas is required by vega-geo, don't remove it
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
