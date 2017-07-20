RTA.clients.ruTorrentAdder = function(server, data, label, dir) {
	if(label == undefined) label = server.rutorrentlabel;
	if(dir == undefined) dir = server.rutorrentdirectory;
	
	var xhr = new XMLHttpRequest();
	
	var url = "http";
	url += (server.hostsecure ? "s" : "");
	url += "://";
	url += server.host;
	url += ":" + server.port;
	if(server.ruTorrentrelativepath == undefined || server.ruTorrentrelativepath[0] != "/")
		url += "/"; // first slash
	if(server.ruTorrentrelativepath != undefined)
		url += server.ruTorrentrelativepath;
	if(server.ruTorrentrelativepath != undefined && server.ruTorrentrelativepath.length != 0 && server.ruTorrentrelativepath[server.ruTorrentrelativepath.length - 1] != "/")
		url += "/"; // trailing slash
	if ( data.split('.').pop() == 'rss') { // The RSS mode rely on RSS Plugin from rutorrent
		url += 'plugins/rss/action.php';
		xhr.open("POST", url, true, server.login, server.password);
		xhr.onreadystatechange = function(data) {
			if(xhr.readyState == 4 && xhr.status == 200) {
				var jsonresponse  = JSON.parse(xhr.responseText);
				if(jsonresponse.errors.length == 0) {
					
					if (server.rutorrentautoRSSManagerRule) {
						var RSSList = jsonresponse.list;
						var xhrRSS = new XMLHttpRequest();
						xhrRSS.open("POST", url, true, server.login, server.password);
						xhrRSS.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
						var message = "mode=setfilters";
						for(var i in RSSList)
						{
						    var anRSSLabel = encodeURIComponent(RSSList[i].label);
						    var anRSSHash = RSSList[i].hash;

						    message+='&name='+anRSSLabel;
					        message+='&pattern=/.*/';
					        message+='&enabled=1';
					        message+='&chktitle=1';
					        message+='&chklink=0';
					        message+='&chkdesc=0';
					        message+='&exclude=';
					        message+='&hash='+ anRSSHash;
					        message+='&start=1';
					        message+='&addPath=1';
					        message+='&dir='+ server.rutorrentRSSManagerdirectory + '/' + anRSSLabel;
					        message+='&label='+anRSSLabel;
					        message+='&interval=-1';
					        message+='&no='+Number(i)+1;
					        message+='&ratio=rat_0';
						}
						xhrRSS.send(message); //TODO message d'erreur a gérer.
					}
					RTA.displayResponse("Success", "RSS added successfully.");
				} else {
					RTA.displayResponse("Failure", "Server didn't accept rss data:\n" + xhr.status + ": " + xhr.responseText, true);
				}
			} else if(xhr.readyState == 4 && xhr.status != 200) {
				RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
			}
		};
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		var encodedData = encodeURIComponent(data);

		var title = '';
		var xhrRssTitle = new XMLHttpRequest();
		xhrRssTitle.open("GET", data, true); 
		xhrRssTitle.onreadystatechange = function(dataRSS) {
			if(xhrRssTitle.readyState == 4) {
				if ( xhrRssTitle.status == 200) {
				var xmlDoc  = xhrRssTitle.responseXML;
					if (xmlDoc) {
						var res = xmlDoc.evaluate("/rss/channel/title", xmlDoc, null, XPathResult.STRING_TYPE, null );
						title = encodeURIComponent(res.stringValue);
					}
				}
				xhr.send("mode=add&url="+encodedData+"&label="+title);		
			}
		}
		xhrRssTitle.send(null);
	} else {
		url += "php/addtorrent.php?";
		if(dir != undefined && dir.length > 0)
			url += "dir_edit=" + encodeURIComponent(dir) + "&";
		if(label != undefined && label.length > 0)
			url += "label=" + encodeURIComponent(label);
		if(server.rutorrentaddpaused)
			url += "&torrents_start_stopped=1";
		
		xhr.open("POST", url, true, server.login, server.password);
		xhr.onreadystatechange = function(data) {
			if(xhr.readyState == 4 && xhr.status == 200) {
				if(/.*addTorrentSuccess.*/.exec(xhr.responseText)) {
					RTA.displayResponse("Success", "Torrent added successfully.");
				} else {
					RTA.displayResponse("Failure", "Server didn't accept data:\n" + xhr.status + ": " + xhr.responseText, true);
				}
			} else if(xhr.readyState == 4 && xhr.status != 200) {
				RTA.displayResponse("Failure", "Server responded with an irregular HTTP error code:\n" + xhr.status + ": " + xhr.responseText, true);
			}
		};
		
		// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
		var boundary = "AJAX-----------------------" + (new Date).getTime();
		var message = "";
		
		if(data.substring(0,7) == "magnet:") {
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xhr.send("url=" + encodeURIComponent(data));
		} else {
			xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
			
			if(dir != undefined && dir.length > 0) {
			   message += "--" + boundary + "\r\n";
			   message += "Content-Disposition: form-data; name=\"dir_edit\"\r\n\r\n";
			   message += dir + "\r\n";
			}
			if(label != undefined && label.length > 0) {
			   message += "--" + boundary + "\r\n";
			   message += "Content-Disposition: form-data; name=\"tadd_label\"\r\n\r\n";
			   message += label + "\r\n";
			}
			   message += "--" + boundary + "\r\n";
			   message += "Content-Disposition: form-data; name=\"torrent_file\"; filename=\"" + (new Date).getTime() + ".torrent\"\r\n";
			   message += "Content-Type: application/x-bittorrent\r\n\r\n";
			   message += data + "\r\n";
			   message += "--" + boundary + "--\r\n";
			
			xhr.sendAsBinary(message);
		}
	}
}

