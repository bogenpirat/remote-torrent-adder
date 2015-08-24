# Introduction #

Remote Torrent Adder, being integrated into the Chrome API, doesn't get around self-signed SSL certificates. Where in the browser you would see a red warning page, asking whether you want to continue browsing to a page, RTA will likely fail with an error message citing a "network error", or "code 0".

To fix this, you need to import the self-signed SSL certificate of your client.


# Importing under Linux #

**fschmaus** was nice enough to post his solution including a script to [issue 24](https://code.google.com/p/remote-torrent-adder/issues/detail?id=24):

> My problem was once again chrome's SSL cert handling under Linux. I needed to extract the SSL certificate from deluge and add it to the nssdb so that Chrome will use the cert without complaining. Remote torrent adder with deluge web-ui over SSL does now work. Here is a script that adds the SSL cert to nssdb:
```
  #!/bin/sh
  #
  # usage:  import-cert.sh remote.host.name [port]
  #
  REMHOST=$1
  REMPORT=${2:-443}
  exec 6>&1
  exec > $REMHOST
  echo | openssl s_client -connect ${REMHOST}:${REMPORT} 2>&1 |sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p'
  certutil -d sql:$HOME/.pki/nssdb -A -t TC -n "$REMHOST" -i $REMHOST 
  exec 1>&6 6>&-
```


# Importing under Windows #

Sadly, the Windows folk doesn't have such elegant little scripts. In fact, we have to whip out the big, bulky guns; namely Internet Explorer.

[Here](http://www.poweradmin.com/help/sslhints/ie.aspx)'s an illustrated tutorial on how to import SSL certificates under Windows.
After following these instructions, you'll probably have to restart Chrome for the changes to take effect.