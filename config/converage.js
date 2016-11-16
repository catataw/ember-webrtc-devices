module.exports = {
     // This is default value
    coverageEnvVar: 'COVERAGE',
     // More reporters found here https://github.com/gotwarlost/istanbul/tree/master/lib/report
    reporters: ['lcov', 'html'],
    // Defaults to ['*/mirage/**/*']
    excludes: [
        "/blueprints", 
        "/config", 
        "/public", 
        "/tmp", 
        "/vendor"
    ],
    // Defaults to coverage. A folder relative to the root of your project to store coverage results.
    coverageFolder: coverage,
    // Set to true or false if you are using ESNext features.
    useBabelInstrumenter: true
}