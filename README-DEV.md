# Instructions for running RG2 locally (Linux)

** These Linux instructions have not been reviewed for a long time and may have issues **

## Install required packages
* web server e.g. apache (`sudo apt install apache2`)
* PHP 8 with the mbstring extension (`sudo apt install php libapache2-mod-php php-mbstring`)
* node.js (`sudo apt install nodejs`)
* npm (included with Node.js)

## Fork and clone repo
`git clone https://github.com/<your username>/rg2`

## Install dependencies and start Vite
```bash
cd rg2
npm install
npm run dev
```

Vite serves the JavaScript and CSS modules with hot reload. Load the application from your PHP-capable web server (for example, `http://localhost/rg2/`); API requests and the page itself are handled by Apache or XAMPP.

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

## Build a release

Run `npm run build` to create the installable files in `dist`. Run `npm run deploy` to build and also create the per-club deployment directories in `website`.
