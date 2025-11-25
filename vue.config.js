module.exports = {
  publicPath: process.env.BASE_URL,
  devServer: {
    allowedHosts: "all",
  },
  lintOnSave: false,
  transpileDependencies: ["vuetify"],
};
