{
  src : "./public/js/src/", // the source dir of js files
  dest : "./public/js/dist/", // the destination of your minified files
  compiledExtension : "min", // extension of the minified file
  runJslint : true, // if should run jsLint
  runGCompiler : true, // if should run GoogleCompiler
  keepCompiled : true, // if should keep the minified files
  order : [], // The order of aggregation (example : we want jquery before jquery.ui) Must not specified every file.
  exclude : [], // Files that are not compiled but still aggregated
  recursive : true, // Should look for javascript recursively
  debug : true, // If in debug mode
}
