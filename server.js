var Hapi = require("hapi");
var Hoek = require("hoek");
var Parser = require("accept-language-parser");
var Path = require("path");

var lastModified = (new Date()).toUTCString();
var server = new Hapi.Server();
server.connection({ port: process.env.PORT });

server.register([
  {
    register: require("vision")
  },
  {
    register: require("hapi-etags"),
    options: {
      varieties: ["plain", "buffer", "view"]
    }
  },
], function(error) {
  Hoek.assert(!error, error);

  server.views({
    engines: {
      hbs: require("handlebars")
    },
    path: Path.join(__dirname, "templates")
  });

  server.route({
    method: 'GET',
    path: '/polyfill.js',
    handler: function(request, reply) {
      var header = Parser.parse(request.headers["accept-language"]);
      var languages_array = header.map(function(l) {
        return l.code + (l.region ? "-" + l.region : "");
      });
      var language_string = languages_array[0];
      var languages_string = JSON.stringify(languages_array);

      reply.view('polyfill', {
        language: language_string,
        languages: languages_string
      }).type("application/javascript")
      .vary("Accept-Language").header("Last-Modified", lastModified);
    },
    config: {
      cache: {
        expiresIn: 24 * 60 * 60 * 1000
      },
      security: process.env.HTTP_HEADER_SECURITY === "true"
    }
  });

  server.start(function () {
    console.log('Server running at: %s', server.info.uri);
  });
});
