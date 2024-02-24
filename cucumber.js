const config = {
  paths: ["features/**/*.feature"],
  require: ["steps/*.js"],

  format: ["@cucumber/pretty-formatter"],
  forceExit: true,
  formatOptions: {
    colorsEnabled: true,
    snippets: true,
    source: true,
    statistics: true,
    snipetInterface: "async-await",
  },
}
module.exports = {
  default: config,
}
