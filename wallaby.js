module.exports = function () {
  return {
    files: [
      'src/**/*.js',
      'app.js',
      'schemas/*',
      'node_modules/five-bells-condition/schemas/*',
      'test/helpers/*.js',
      'test/data/*'
    ],

    tests: [
      'test/*Spec.js'
    ],

    testFramework: 'mocha',

    env: {
      type: 'node',
      runner: 'node',
      params: {
        env: 'NODE_ENV=unit'
      }
    },

    bootstrap: function (wallaby) {
      require('co-mocha')(wallaby.testFramework.constructor)
    }
  }
}
