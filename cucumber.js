const config = {
  paths: ["features/**/*.feature"],
  require: ["steps/**/*.steps.js"],
  format: ["@cucumber/pretty-formatter"],
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
