$(document).ready(function(){ 
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
	
	$("#tabs-1 > table > tbody.specifics").each(function() {
		if(divid == $(this).attr("id"))
			$(this).css("display", "table-row-group");
		else 
			$(this).css("display", "none");
	});
}

function setSetting(e, val) {
	localStorage[e.id] = val;
}

function getSetting(e) {
	if(e.type == "text" || e.type == "password") {
		document.getElementById(e.id).value = localStorage[e.id];
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