$(document).ready(function(){
	registerAllEvents();

	loadAllSettings();
	
	$(function() {
		$("#tabs").tabs();
	});
});

function loadAllSettings() {
	var e = document.getElementsByTagName("input");
	for (key in e) {
		getSetting(e[key]);
	}
	// set client selection
	var clientopts = document.getElementById("client").getElementsByTagName("option");
	for (key in clientopts) {
		if(clientopts[key].text == localStorage["client"]) {
			clientopts[key].selected = true;
			break;
		}
	}
	// load matches
	loadMatches();
	
	// set visibility of client specific settings
	activateSpecificsPage(localStorage["client"]);
	
	// set visibility
	flipVisibility("showpopups", "popupduration");
	flipVisibility("catchfrompage", "linkmatches");
}

function flipVisibility(checkname, changename) {
	document.getElementById(changename).disabled = (document.getElementById(checkname).checked)?false:true;
}

function activateSpecificsPage(clientname) {
	var divid;
	
	if(clientname == "ruTorrent WebUI")
		divid = "rutorrentspecifics";
	if(clientname == "Torrentflux WebUI")
		divid = "torrentfluxspecifics";
	if(clientname == "Transmission WebUI")
		divid = "transmissionspecifics";
	if(clientname == "uTorrent WebUI")
		divid = "utorrentspecifics";
	if(clientname == "Vuze SwingUI")
		divid = "vuzeswingspecifics";
	if(clientname == "Vuze Remote WebUI")
		divid = "vuzeremotespecifics";
	if(clientname == "Vuze HTML WebUI")
		divid = "vuzehtmlspecifics";
	if(clientname == "Buffalo WebUI")
		divid = "buffalospecifics";
	if(clientname == "qBittorrent WebUI")
		divid = "qbittorrentspecifics";
	if(clientname == "Deluge WebUI")
		divid = "delugewebuispecifics";
	if(clientname == "pyrt WebUI")
		divid = "pyrtwebuispecifics";
	if(clientname == "Tixati WebUI")
		divid = "tixatiwebuispecifics";
	
	$("#tabs-1 > table > tbody.specifics").each(function() {
		if(divid == $(this).attr("id"))
			$(this).css("display", "table-row-group");
		else 
			$(this).css("display", "none");
	});
}

function setSetting(e, val) {
	localStorage[e.id] = (val == undefined)?"":val;
}

function getSetting(e) {
	if(e.type == "text" || e.type == "password") {
		document.getElementById(e.id).value = (localStorage[e.id]==undefined)?"":localStorage[e.id];
	} else if(e.type == "checkbox") {
		document.getElementById(e.id).checked = (localStorage[e.id]=="true")?true:false;
	}
}

function saveMatches() {
	var opts = document.getElementById("linkmatches").getElementsByTagName("option");
	var destStr = ""; var i=0;
	for(key in opts)
		if(opts[key].text) {
			var sep = (i++==0)?"":"~";
			destStr += sep+opts[key].text;
		}
	localStorage["linkmatches"] = destStr;
}

function loadMatches() {
	var newSelEl = document.createElement("select");
	newSelEl.setAttribute("id", "linkmatches");
	newSelEl.setAttribute("multiple", "multiple");
	newSelEl.setAttribute("size", "5");
	if(localStorage["linkmatches"] != "")
		for(key in localStorage["linkmatches"].split("~")) {
			var newEl = document.createElement("option");
			newEl.text = localStorage["linkmatches"].split("~")[key];
			newSelEl.appendChild(newEl);
		}
	var selEl = document.getElementById("linkmatches");
	selEl.parentNode.appendChild(newSelEl);
	selEl.parentNode.removeChild(selEl);
}

function addMatch() {
	var newMatch = prompt("Enter a partial string of a link that should be caught by the extension","");
	if(!newMatch) return;
	
	var newOpt = new Option(newMatch);
	document.getElementById('linkmatches').appendChild(newOpt);
	saveMatches();
}

function deleteMatches() {
	var list = document.getElementById('linkmatches');
	for(var i = list.length-1; i>=0; i--)
		if(list.options[i].selected) {
			list.removeChild(list.options[i]);
		}
	saveMatches();
}

Storage.prototype.setObject = function(key, val) {
	this.setItem(key, JSON.stringify(val));
}
Storage.prototype.getObject = function(key) {
	var value = this.getItem(key);
    return value && JSON.parse(value);
}

function registerAllEvents() {
	document.querySelector("#client").onchange = function() {
		setSetting(this, this.options[this.selectedIndex].text);
		activateSpecificsPage(this.options[this.selectedIndex].text);
	};
	
	document.querySelector("#host").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#port").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#hostsecure").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#login").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#password").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#ruTorrentrelativepath").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#rutorrentlabel").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#rutorrentdirectory").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#rutorrentdirlabelask").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#rutorrentaddpaused").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#torrentfluxrelativepath").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#utorrentrelativepath").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#delugerelativepath").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#linksfoundindicator").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#showpopups").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	document.querySelector("#showpopups").onclick = function() {
		flipVisibility(this.id, 'popupduration');
	};
	
	document.querySelector("#popupduration").onkeyup = function() {
		setSetting(this, this.value);
	};
	
	document.querySelector("#notificationtest").onclick = function() {
		var opts = { 
					type: "basic", 
					iconUrl: "icons/BitTorrent128.png", 
					title: "This is a test notification",
					priority: 0,
					message: "This is a test message!"
					};
		var id = Math.floor(Math.random() * 99999) + "";
		
		chrome.notifications.create(id, opts, function(myId) { id = myId });
		
		setTimeout(function(){chrome.notifications.clear(id, function() {});}, localStorage['popupduration']);
	};
	
	document.querySelector("#catchfromcontextmenu").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#catchfrompage").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	document.querySelector("#catchfrompage").onclick = function() {
		flipVisibility(this.id, 'linkmatches');
	};
	
	document.querySelector("#catchfromnewtab").onchange = function() {
		setSetting(this, (this.checked)?'true':'false');
	};
	
	document.querySelector("#addfilterbtn").onclick = function() {
		addMatch();
	};
	
	document.querySelector("#delfilterbtn").onclick = function() {
		deleteMatches();
	};
	
	document.querySelector("#showfiltersbtn").onclick = function() {
		alert(localStorage['linkmatches']);
	};
}