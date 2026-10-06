const { port, apiBaseUrl } = require("./config");
const { createApp } = require("./app");

createApp().listen(port, () => {
  console.log(`Admin BFF listening on :${port} → API ${apiBaseUrl}`);
});
