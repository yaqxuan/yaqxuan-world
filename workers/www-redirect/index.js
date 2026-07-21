export default {
  async fetch(request) {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = "yaqxuan.com";
    target.port = "";

    return Response.redirect(target.toString(), 301);
  },
};
