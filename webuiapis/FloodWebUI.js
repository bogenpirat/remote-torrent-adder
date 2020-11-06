RTA.clients.floodAdder = function (server, torrentdata) {
  const dir = server.flooddirectory;
  const paused = server.floodaddpaused;
  const tags = JSON.parse(server.labellist);

  var apiUrl =
    (server.hostsecure ? "https://" : "http://") +
    server.host +
    ":" +
    server.port;

  fetch(apiUrl + "/api/auth/authenticate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ username: server.login, password: server.password }),
  })
    .then(RTA.handleFetchError)
    .then((response) => response.json())
    .then(async (json) => {
      if (!json.success) {
        RTA.displayResponse(
          "Failure",
          "Login to " + server.name + "'s WebUI failed.",
          true
        );
      } else {
        var fetchOpts = {
          method: "POST",
        };
        if (torrentdata.substring(0, 7) == "magnet:") {
          apiUrl += "/api/torrents/add-urls";
          fetchOpts.headers = {
            "Content-Type": "application/json; charset=UTF-8",
          };
          fetchOpts.body = JSON.stringify({
            urls: [torrentdata],
            destination: !!dir ? dir : undefined,
            tags,
            start: !paused,
          });
        } else {
          // for proper base64 encoding, this needs to be shifted into a 8 byte integer array
          const data = new Uint8Array(
            await RTA.convertToBlob(torrentdata).arrayBuffer()
          );

          apiUrl += "/api/torrents/add-files";
          fetchOpts.headers = {
            "Content-Type": "application/json; charset=UTF-8",
          };
          fetchOpts.body = JSON.stringify({
            files: [b64_encode(data)],
            destination: !!dir ? dir : undefined,
            tags,
            start: !paused,
          });
        }

        fetch(apiUrl, fetchOpts)
          .then(RTA.handleFetchError)
          .then((response) => response.text())
          .then((text) => {
            if (text == '[["0"]]') {
              RTA.displayResponse("Success", "Torrent added successfully.");
            } else {
              RTA.displayResponse(
                "Failure",
                "Torrent not added successfully:\n" + text
              );
            }
          })
          .catch((error) => {
            RTA.displayResponse(
              "Failure",
              "Could not contact " + server.name + "\nError: " + error.message,
              true
            );
          });
      }
    })
    .catch((error) => {
      RTA.displayResponse(
        "Failure",
        "Could not contact " + server.name + "\nError: " + error.message,
        true
      );
    });
};
