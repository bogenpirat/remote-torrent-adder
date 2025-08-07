var rta_modal_open, rta_modal_close;

chrome.runtime.sendMessage({"action": "getStorageData"}, function(response) {
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
		if(response["linksfoundindicator"]=="true") chrome.runtime.sendMessage({"action": "pageActionToggle"});
		
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
						else if (server["qbittorrentv2dirlabelask"] && server["client"]=="qBittorrent v4.1+ WebUI") {
							showLabelDirChooser(response, url);
						}
						else {
							var ref = new URL(window.location);
							ref.hash = '';
							chrome.runtime.sendMessage({"action": "addTorrent", "url": url, "label": undefined, "dir": undefined, "referer": ref.toString()});
						}
					}
				});
			}
		}
	}
}

// register a listener that'll display the dir/label selection dialog
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	console.log('Content script received message:', request);

	if(request.action == "showLabelDirChooser" && request.url && request.settings) {
		console.log('Showing label/dir chooser popup');
		try {
			var modals = rta_modal_init();
			rta_modal_open = modals[0];
			rta_modal_close = modals[1];
			showLabelDirChooser(request.settings, request.url, request.server);
			sendResponse({success: true});
		} catch (error) {
			console.error('Error showing label/dir chooser:', error);
			sendResponse({success: false, error: error.message});
		}
	} else {
		console.log('Message not handled by content script');
		sendResponse({success: false, reason: 'Invalid message format'});
	}
});

function showLabelDirChooser(settings, url, theServer) {
	console.log('showLabelDirChooser called with:', {settings, url, theServer});

	var servers = JSON.parse(settings.servers);
	var server, serverIndex = 0;
	if(theServer == null) {
		server = servers[0];
		console.log('Using first server:', server);
	} else {
		server = theServer;
		console.log('Using provided server:', server);
		for(var x in servers) {
			if(servers[x].name == theServer.name) {
				serverIndex = x;
			}
		}
	}

	var dirlist = server["dirlist"] ? JSON.parse(server["dirlist"]) : [];
	var labellist = server["labellist"] ? JSON.parse(server["labellist"]) : [];

	console.log('Current dirlist:', dirlist);
	console.log('Current labellist:', labellist);

	// Temporary visible debugging
	if (dirlist.length > 0 || labellist.length > 0) {
		console.log('Found stored values - dirs:', dirlist, 'labels:', labellist);
	} else {
		console.log('No stored directories or labels found');
	}

	var adddialog = "<div id=\"rta_modal_wrapper\"><div id=\"rta_modal_window\">";
	adddialog += "<style>";
	adddialog += "#rta_modal_wrapper { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }";
	adddialog += "#rta_modal_window { background: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 24px; min-width: 400px; }";
	adddialog += "#rta_modal_window h2 { margin: 0 0 20px 0; color: #333; font-size: 18px; font-weight: 600; }";
	adddialog += ".rta-form-group { margin-bottom: 16px; }";
	adddialog += ".rta-form-label { display: block; margin-bottom: 6px; color: #555; font-weight: 500; font-size: 14px; }";
	adddialog += ".rta-form-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }";
	adddialog += ".rta-form-row select, .rta-form-row input[type='text'] { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }";
	adddialog += ".rta-form-row select { min-width: 150px; background: white; }";
	adddialog += ".rta-form-row input[type='text'] { flex: 1; min-width: 200px; }";
	adddialog += ".rta-remove-btn { width: 20px; height: 20px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }";
	adddialog += ".rta-remove-btn:hover { opacity: 1; }";
	adddialog += ".rta-submit-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 8px; }";
	adddialog += ".rta-submit-btn:hover { background: #0056b3; }";
	adddialog += ".rta-or-text { color: #666; font-size: 13px; margin: 0 8px; }";
	adddialog += "</style>";
	adddialog += "<h2>Select label and directory for torrent adding</h2>";
	adddialog += "<form id=\"rta_addform\">";

	// Directory section
	adddialog += "<div class=\"rta-form-group\">";
	adddialog += "<label class=\"rta-form-label\">Directory:</label>";
	adddialog += "<div class=\"rta-form-row\">";
	adddialog += "<select id=\"adddialog_directory\">";
	adddialog += "<option value=\"\">Select directory...</option>";
	for(x in dirlist) adddialog += "<option value=\""+dirlist[x]+"\">"+dirlist[x]+"</option>";
	adddialog += "</select>";
	adddialog += "<img class=\"rta-remove-btn\" id=\"dirremover\" src=\"" + chrome.runtime.getURL("icons/White_X_in_red_background.svg") + "\" title=\"Remove selected directory\" />";
	adddialog += "</div>";
	adddialog += "<div class=\"rta-form-row\">";
	adddialog += "<span class=\"rta-or-text\">or enter new:</span>";
	adddialog += "<input id=\"adddialog_directory_new\" type=\"text\" placeholder=\"/path/to/directory\" />";
	adddialog += "</div>";
	adddialog += "</div>";

	// Label section
	adddialog += "<div class=\"rta-form-group\">";
	adddialog += "<label class=\"rta-form-label\">Label:</label>";
	adddialog += "<div class=\"rta-form-row\">";
	adddialog += "<select id=\"adddialog_label\">";
	adddialog += "<option value=\"\">Select label...</option>";
	for(x in labellist) adddialog += "<option value=\""+labellist[x]+"\">"+labellist[x]+"</option>";
	adddialog += "</select>";
	adddialog += "<img class=\"rta-remove-btn\" id=\"labelremover\" src=\"" + chrome.runtime.getURL("icons/White_X_in_red_background.svg") + "\" title=\"Remove selected label\" />";
	adddialog += "</div>";
	adddialog += "<div class=\"rta-form-row\">";
	adddialog += "<span class=\"rta-or-text\">or enter new:</span>";
	adddialog += "<input id=\"adddialog_label_new\" type=\"text\" placeholder=\"Label name\" />";
	adddialog += "</div>";
	adddialog += "</div>";

	adddialog += "<button class=\"rta-submit-btn\" id=\"adddialog_submit\" type=\"submit\">Add Torrent</button>";
	adddialog += "</form>";
	
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

		console.log('Form submission values:', {selectedLabel, inputLabel, selectedDir, inputDir});

		var targetLabel = (inputLabel=="")? ((selectedLabel==null)? "" : selectedLabel) : inputLabel;
		var targetDir = (inputDir=="")? ((selectedDir==null)? "" : selectedDir) : inputDir;

		console.log('Final target values:', {targetLabel, targetDir});

		var ref = new URL(window.location);
		ref.hash = '';
		chrome.runtime.sendMessage({"action": "addTorrent", "url": url, "label": targetLabel, "dir": targetDir, "server": server, "referer": ref.toString()});

		setNewSettings(settings, dirlist, labellist, targetDir, targetLabel, serverIndex);

		rta_modal_close();

		return false;
	};

	function setNewSettings(settings, baseDirs, baseLabels, newDir, newLabel, serverIndex) {
		console.log('setNewSettings called with:', {baseDirs, baseLabels, newDir, newLabel, serverIndex});

		chrome.runtime.sendMessage({"action": "getStorageData"}, function(response) {
			console.log('getStorageData response:', response);

			var servers = JSON.parse(response.servers);
			var server;
			if(!serverIndex) {
				server = servers[0];
			} else {
				server = servers[serverIndex];
			}

			console.log('Current server before update:', server);

			var labellist = baseLabels;
			var dirlist = baseDirs;

			var labelOldPos, dirOldPos;
			while((labelOldPos = labellist.indexOf(newLabel)) != -1) {
				labellist.splice(labelOldPos, 1);
			}
			while((dirOldPos = dirlist.indexOf(newDir)) != -1) {
				dirlist.splice(dirOldPos, 1);
			}

			if(newDir !== null && newDir !== "") {
				dirlist.unshift(newDir);
				console.log('Added new directory:', newDir);
			}
			if(newLabel !== null && newLabel !== "") {
				labellist.unshift(newLabel);
				console.log('Added new label:', newLabel);
			}

			console.log('Updated dirlist:', dirlist);
			console.log('Updated labellist:', labellist);

			server["dirlist"] = JSON.stringify(dirlist);
			server["labellist"] = JSON.stringify(labellist);

			servers[serverIndex] = server;
			settings.servers = JSON.stringify(servers);

			console.log('Saving updated settings:', settings);
			chrome.runtime.sendMessage({"action": "setStorageData", "data": settings}, function(saveResponse) {
				if (chrome.runtime.lastError) {
					console.error('Error saving settings:', chrome.runtime.lastError);
				} else {
					console.log('Settings saved successfully:', saveResponse);
				}
			});
		});
	}
}
