var rta_modal_open, rta_modal_close;

chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
	var delay = 0;
	if(response["registerDelay"] > 0) {
		delay = response["registerDelay"];
	}
	setTimeout(function() { registerLinks(response); }, delay);
});

function registerLinks(response) {
	if(response["catchfrompage"] != "true") return;
	
	// handle common links
	var links = new Array();
	var rL = document.getElementsByTagName('a');
	res = response["linkmatches"].split("~");
	res.push("magnet:");
	if(response["linkmatches"] != "") {
		for(lkey in rL) {
		for(mkey in res) {
			if(rL[lkey].href && rL[lkey].href.match(new RegExp(res[mkey], "g"))) {
				links.push(rL[lkey]);
				break;
			}
		}}
	}
	
	// handle forms
	var rB1 = Array.prototype.slice.call(document.getElementsByTagName('button'));
	var rB2 = Array.prototype.slice.call(document.getElementsByTagName('input'));
	var rB = rB1.concat(rB2);
	
	var forms = new Array();
	for (x in rB) { // get an index-parallel array of parent forms
		forms.push(rB[x].form);
	}
	for (x in rB) {
		for(mkey in res) {
			if(forms[x] != null && forms[x].hasAttribute('action') && forms[x].action.match && forms[x].action.match(new RegExp(res[mkey], "g"))) {
				rB[x].href = forms[x].action;
				links.push(rB[x]);
				break;
			}
		}
	}
	
	// re-register actions
	if(links.length != 0) {
		var modals = rta_modal_init();
		rta_modal_open = modals[0];
		rta_modal_close = modals[1];
		if(response["linksfoundindicator"]=="true") chrome.extension.sendRequest({"action": "pageActionToggle"});
		
		for(key in links) {
			if(links[key].addEventListener) {
				links[key].addEventListener('click', function(e) {
					if(!(e.ctrlKey || e.shiftKey || e.altKey)) {
						e.preventDefault();
						var url = this.href;
						
						var servers = JSON.parse(response.servers);
						var server = servers[0];

						if(server["rutorrentdirlabelask"] && server["client"]=="ruTorrent WebUI") {
							showLabelDirChooser(response, url);
						}
						else if (server["qbittorrentdirlabelask"] && server["client"]=="qBittorrent WebUI") {
							showLabelDirChooser(response, url);
						}
						else {
							chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": undefined, "dir": undefined});
						}
					}
				});
			}
		}
	}
}

// register a listener that'll display the dir/label selection dialog
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if(request.action == "showLabelDirChooser" && request.url && request.settings) {
		var modals = rta_modal_init();
		rta_modal_open = modals[0];
		rta_modal_close = modals[1];
		showLabelDirChooser(request.settings, request.url, request.server);
		sendResponse({});
	}
});

function showLabelDirChooser(settings, url, theServer) {
	var servers = JSON.parse(settings.servers);
	var server, serverIndex = 0;
	if(theServer == null) {
		server = servers[0];
	} else {
		server = theServer;
		for(var x in servers) {
			if(servers[x].name == theServer.name) {
				serverIndex = x;
			}
		}
	}

	var dirlist = server["dirlist"] ? JSON.parse(server["dirlist"]) : [];
	var labellist = server["labellist"] ? JSON.parse(server["labellist"]) : [];

	var adddialog = "<div id=\"rta_modal_wrapper\"><div id=\"rta_modal_window\">";
	adddialog += "<style>#rta_modal_wrapper { color: rgb(68, 68, 68); background: rgb(249, 249, 249); } #dirremover, #labelremover { height: 1em; cursor: pointer; } </style>";
	adddialog += "<h2 style=\"color: rgb(68, 68, 68);\">Select label and directory for torrent adding</h2>";
	adddialog += "<form id=\"rta_addform\">Directory: <select id=\"adddialog_directory\">";
	for(x in dirlist) adddialog += "<option value=\""+dirlist[x]+"\">"+dirlist[x]+"</option>";
	adddialog += "</select>";
	adddialog += " <img id=\"dirremover\" src=\"" + chrome.extension.getURL("icons/White_X_in_red_background.svg") + "\" /> ";
	adddialog += "or new: <input id=\"adddialog_directory_new\" type=\"text\" /><br/>";
	adddialog += "Label: <select id=\"adddialog_label\">";
	for(x in labellist) adddialog += "<option value=\""+labellist[x]+"\">"+labellist[x]+"</option>";
	adddialog += "</select>";
	adddialog += " <img id=\"labelremover\" src=\"" + chrome.extension.getURL("icons/White_X_in_red_background.svg") + "\" /> ";
	adddialog += " or new: <input id=\"adddialog_label_new\" type=\"text\" /><br/>";
	adddialog += "<input id=\"adddialog_submit\" type=\"submit\" value=\"Add Torrent\" /></form>";
	
	document.querySelector("body").insertAdjacentHTML("beforeend", adddialog);
	
	rta_modal_open();

	document.querySelector("#dirremover").onclick = function() {
		var toRemove = document.querySelector("#adddialog_directory option:checked")
		if(toRemove) {
			var index;
			if(-1 != (index = dirlist.indexOf(toRemove.value))) {
				dirlist.splice(index, 1);
				
				toRemove.remove();
				
				setNewSettings(settings, dirlist, labellist, null, null, serverIndex);
			}
		}
	};
	document.querySelector("#labelremover").onclick = function() {
		var toRemove = document.querySelector("#adddialog_label option:checked");
		if(toRemove) {
			var index;
			if(-1 != (index = labellist.indexOf(toRemove.value))) {
				labellist.splice(index, 1);
				
				toRemove.remove();
				
				setNewSettings(settings, dirlist, labellist, null, null, serverIndex);
			}
		}
	};
	
	document.querySelector("#rta_addform").onsubmit = function() {
		var selectedLabel = document.querySelector("select#adddialog_label").value;
		var inputLabel = document.querySelector("input#adddialog_label_new").value;
		var selectedDir = document.querySelector("select#adddialog_directory").value;
		var inputDir = document.querySelector("input#adddialog_directory_new").value;
		
		var targetLabel = (inputLabel=="")? ((selectedLabel==null)? "" : selectedLabel) : inputLabel;
		var targetDir = (inputDir=="")? ((selectedDir==null)? "" : selectedDir) : inputDir;
		
		chrome.extension.sendRequest({"action": "addTorrent", "url": url, "label": targetLabel, "dir": targetDir, "server": server});
		
		setNewSettings(settings, dirlist, labellist, targetDir, targetLabel, serverIndex);
		
		rta_modal_close();
		
		return false;
	};

	function setNewSettings(settings, baseDirs, baseLabels, newDir, newLabel, serverIndex) {
		chrome.extension.sendRequest({"action": "getStorageData"}, function(response) {
			var servers = JSON.parse(response.servers);
			var server;
			if(!serverIndex) {
				server = servers[0];
			} else {
				server = servers[serverIndex];
			}
			
			var labellist = baseLabels;
			var dirlist = baseDirs;

			var labelOldPos, dirOldPos;
			while((labelOldPos = labellist.indexOf(newLabel)) != -1) {
				labellist.splice(labelOldPos, 1);
			}
			while((dirOldPos = dirlist.indexOf(newDir)) != -1) {
				dirlist.splice(dirOldPos, 1);
			}
			
			if(newDir !== null) {
				dirlist.unshift(newDir);
			}
			if(newLabel !== null) {
				labellist.unshift(newLabel);
			}

			server["dirlist"] = JSON.stringify(dirlist);
			server["labellist"] = JSON.stringify(labellist);

			servers[serverIndex] = server;
			settings.servers = JSON.stringify(servers);

			chrome.extension.sendRequest({"action": "setStorageData", "data": settings});
		});
	}
}
