// Init
load("build/runtest/env.js");
window.location = "test/index.html";

// Load the test runner
load("dist/jquery.js","build/runtest/testrunner.js");

// Load the tests
load("src/jquery/coreTest.js","src/selector/selectorTest.js");

// Display the results
results();