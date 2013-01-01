function addTorrentToTorrentfluxWebUI(torrentdata, torrentname) {
	if(torrentdata.substring(0,7) == "magnet:") {
		displayResponse("Client Failure", "sorry, but torrentflux doesn't support magnet links.");
		return;
	}
	
	var loginurl = "http"+((localStorage["hostsecure"]=='true')?"s":"")+"://"+localStorage["host"]+":"+localStorage["port"]+localStorage["torrentfluxrelativepath"]+"/login.php";
	
	// log in to create a functioning session
	var xhr = new XMLHttpRequest();
	xhr.open("POST", loginurl, false);
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhr.send("username="+localStorage["login"]+"&iamhim="+localStorage["password"]);
	
	if(/.*Password is required.*/.exec(xhr.responseText) || /.*Login failed.*/.exec(xhr.responseText)) {
		displayResponse("Failure", "Credentials weren't accepted:\n"+xhr.responseText);
		return;
	}
	
	// send the torrent
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "http"+((localStorage["hostsecure"]=='true')?"s":"")+"://"+localStorage["host"]+":"+localStorage["port"]+localStorage["torrentfluxrelativepath"]+"/index.php", true);
	xhr.onreadystatechange = function(data) {
		if(xhr.readyState == 4 && xhr.status == 200) {
			displayResponse("Success", "Torrent added successfully.");
		} else if(xhr.readyState == 4 && xhr.status != 200) {
			displayResponse("Failure", "Server didn't accept data:\n"+xhr.status+": "+xhr.responseText);
		}
	};
	
	// mostly stolen from https://github.com/igstan/ajax-file-upload/blob/master/complex/uploader.js
	var boundary = "AJAX-----------------------"+(new Date).getTime();
	xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	var message = "--" + boundary + "\r\n";
	   message += "Content-Disposition: form-data; name=\"upload_file\"; filename=\""+((torrentname.length && torrentname.length>1) ? torrentname : (new Date).getTime())+"\"\r\n";
	   message += "Content-Type: application/x-bittorrent\r\n\r\n";
	   message += torrentdata + "\r\n";
	   message += "--" + boundary + "--\r\n";
	
	xhr.sendAsBinary(message);
}