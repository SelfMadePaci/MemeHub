require "json"
require "webrick"

APP_ROOT = File.expand_path(__dir__)
STATIC_FILES = {
  "/" => ["index.html", "text/html; charset=utf-8"],
  "/index.html" => ["index.html", "text/html; charset=utf-8"],
  "/results.html" => ["results.html", "text/html; charset=utf-8"],
  "/styles.css" => ["styles.css", "text/css; charset=utf-8"],
  "/app.js" => ["app.js", "text/javascript; charset=utf-8"],
}.freeze

def json_response(response, status, body)
  response.status = status
  response["Content-Type"] = "application/json; charset=utf-8"
  response["Cache-Control"] = "no-store"
  response.body = JSON.generate(body)
end

def serve_static(request, response)
  file = STATIC_FILES[request.path]
  unless file
    json_response(response, 404, { error: "Not found." })
    return
  end

  filename, content_type = file
  response.status = 200
  response["Content-Type"] = content_type
  response["Cache-Control"] = "no-store"
  response.body = File.read(File.join(APP_ROOT, filename))
end

server = WEBrick::HTTPServer.new(
  BindAddress: "127.0.0.1",
  Port: Integer(ENV.fetch("PORT", "8765")),
  AccessLog: [],
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN)
)

server.mount_proc("/") do |request, response|
  if request.request_method == "GET" || request.request_method == "HEAD"
    serve_static(request, response)
  else
    response["Allow"] = "GET, HEAD"
    json_response(response, 405, { error: "Only GET and HEAD are supported." })
  end
end

trap("INT") { server.shutdown }
trap("TERM") { server.shutdown }
server.start
