# Instructions for running RG2 locally (linux)

TODO: Not yet adapted to Vite build environment

## Install required packages
* web server e.g. apache (`sudo apt install apache2`)
* php (`sudo apt install php libapache2-mod-php`)
* node.js (`sudo apt install nodejs`)
* grunt (`npm install -g grunt-cli`)

## Fork and clone repo
`git clone https://github.com/<your username>/rg2`

## Run grunt
```bash
cd rg2
grunt
```

## Setup apache web server
In your `apache2.conf` e.g. `sudo vi /etc/apache2/apache2.conf`
```
<Directory /path/to/rg2/>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
</Directory>
Alias "/rg2" "/path/to/rg2"
```
Then `sudo service apache2 restart`.

## Setup rg2 config options
Edit `rg2-config.txt` and rename to `rg2-config.php`, suggested options:
```php
define('RG_BASE_DIRECTORY', 'http://localhost/');
define('OVERRIDE_KARTAT_DIRECTORY', 'kartat/');
```
Create some test data (from your `rg2` directory)
```bash
mkdir kartat
mkdir kartat/cache
wget https://www.happyherts.routegadget.co.uk/kartat/cache/events.json -O kartat/cache/events.json
```

## Launch browser
Go to `http://localhost/rg2/`, and you should see your local rg2 app.
