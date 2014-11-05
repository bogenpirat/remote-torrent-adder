RTA.clients.config.getConfig = function(client, name) {
	var clientMap = {
		"ruTorrent WebUI" : RTA.clients.config.rutorrent,
		"Torrentflux WebUI" : RTA.clients.config.torrentflux,
		"uTorrent WebUI" : RTA.clients.config.utorrent,
		"Deluge WebUI" : RTA.clients.config.deluge,
	};
	
	var config = "<table>" + RTA.clients.config.generalsettings.replace(/\{clienttype\}/g, client).replace(/\{name\}/g, name);

	if(clientMap.hasOwnProperty(client))
		config += clientMap[client];

	return config;
};

RTA.clients.config.generalsettings = multiline(function(){/*
			<tbody>
				<tr>
					<td><span class="title">Name</span></td>
					<td><input type="text" name="name" value="{name}" /></td>
				</tr>
				<tr>
					<td><span class="title">Type</span></td>
					<td><input type="hidden" name="client" value="{clienttype}" /> {clienttype}</td>
				</tr>
				<tr>
					<td><span class="title">Host</span></td>
					<td><input type="text" name="host" /><br />
						<span class="tip">The ip/hostname to connect to</span></td>
				</tr>
				<tr>
					<td><span class="title">Port</span></td>
					<td><input type="text" name="port" /><br />
						<span class="tip">The remote port</span></td>
				</tr>
				<tr>
					<td><span class="title">SSL</span></td>
					<td><input type="checkbox" name="hostsecure" /><br />
						<span class="tip">Check if the WebUI runs on SSL (http<strong>s</strong>://). Set the Port to 443!</span></td>
				</tr>
				<tr>
					<td><span class="title">Username</span></td>
					<td><input type="text" name="login" /><br />
						<span class="tip">Login name of the WebUI</span></td>
				</tr>
				<tr>
					<td><span class="title">Password</span></td>
					<td><input type="password" name="password" /><br />
						<span class="tip">Password of the WebUI</span></td>
				</tr>
			</tbody>
			*/});



RTA.clients.config.deluge = multiline(function(){/*
			<tbody name="delugewebuispecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span><br />(optional)</td>
					<td><input type="text" name="delugerelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui</strong>&quot;/<br />
							Note: Unless you are doing reverse-proxying, this field should be left empty</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.rutorrent = multiline(function(){/*
			<tbody name="rutorrentspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span></td>
					<td><input type="text" name="ruTorrentrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />
							Note: this folder should contain the "php" directory.</span></td>
				</tr>
				<tr>
					<td><span class="title">Label</span><br />(optional)</td>
					<td><input type="text" name="rutorrentlabel" /><br />
						<span class="tip">Default label to use for added torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Directory</span><br />(optional)</td>
					<td><input type="text" name="rutorrentdirectory" /><br />
						<span class="tip">Default directory to store added torrents in. This should be an absolute path. It should be inside your default directory for torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Label/Directory<br/>interactivity</span></td>
					<td><input type="checkbox" name="rutorrentdirlabelask" /><br />
						<span class="tip">Enable this to always ask for a label/directory combination upon adding torrents.</span></td>
				</tr>
				<tr>
					<td><span class="title">Add torrents paused?</span></td>
					<td><input type="checkbox" name="rutorrentaddpaused" /></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.torrentflux = multiline(function(){/*
			<tbody name="torrentfluxspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span></td>
					<td><input type="text" name="torrentfluxrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/some/path/to/webui</strong>&quot;/<br />
							Note: this directory should contain the files "login.php"/"index.php"</span></td>
				</tr>
			</tbody>
			*/});

RTA.clients.config.utorrent = multiline(function(){/*
			<tbody name="utorrentspecifics" class="specifics">
				<tr>
					<td><span class="title">Relative path</span><br />(optional)</td>
					<td><input type="text" name="utorrentrelativepath" /><br />
						<span class="tip">Enter only the text in quotation marks: http://someserver.com&quot;<strong>/gui/</strong>&quot;<br />
							Note: Unless you are doing reverse-proxying, this field should be left empty</span></td>
				</tr>
			</tbody>
			*/});