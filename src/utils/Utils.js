class Utils {
  static sanitizeUrl(url) {
    return url?.replace(/(^\w+:|^)\/\//, "");  }
}

export default Utils;
