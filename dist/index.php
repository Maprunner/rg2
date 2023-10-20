<?php
require(dirname(__FILE__) . '/app/user.php');
require(dirname(__FILE__) . '/app/utils.php');

// version replaced by Gruntfile as part of release
define('RG2VERSION', '2.0.3');
define("RG_LOG_FILE", dirname(__FILE__) . "/log/rg2log.txt");

if (file_exists(dirname(__FILE__) . '/rg2-config.php')) {
  require_once(dirname(__FILE__) . '/rg2-config.php');
} else {
  echo "Routegadget 2: Configuration file " . dirname(__FILE__) . "/rg2-config.php not found.";
  return;
}

$base = "/rg2/";
// temporary bodge to get build working
if ("//localhost" === RG_BASE_DIRECTORY) {
  $production = false;
} else {
  $production = true;
}

$api_url = RG_BASE_DIRECTORY . $base . "rg2api.php";
if (defined('OVERRIDE_SOURCE_DIRECTORY')) {
  $source_url = OVERRIDE_SOURCE_DIRECTORY . $base;
} else {
  $source_url = RG_BASE_DIRECTORY . $base;
}

// messy but works OK for now
// Overrides work OK on a local server which is what they are intended for
if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
  $maps_dir = OVERRIDE_KARTAT_DIRECTORY;
  $maps_url = OVERRIDE_KARTAT_DIRECTORY;
} else {
  $maps_dir = "../kartat/";
  $maps_url = RG_BASE_DIRECTORY . "/kartat/";
}
define('KARTAT_DIRECTORY', $maps_dir);

// save grief when initial set-up is wrong...
if (!file_exists($maps_dir)) {
  echo "Routegadget 2: Kartat directory " . $maps_dir . " not found.";
  return;
}

// include manager function as parameter for now until we decide the best way forward
if (isset($_GET['manage'])) {
  $manager = true;
  $keksi = user::generateNewKeksi();
} else {
  $manager =  false;
}

// include language file if requested
if ((defined('START_LANGUAGE'))) {
  $lang = START_LANGUAGE;
} else {
  $lang = "en";
}

// based on https://github.com/firtadokei/codeigniter-vitejs
if ($production) {
  $manifestfile = 'manifest.json';
  $manifest = file_get_contents($manifestfile);
  $manifest = json_decode($manifest);
  $jsfiles = "";
  $cssfiles = "";

  foreach ($manifest as $file) {
    $fileExtension = substr($file->file, -3, 3);
    if ($fileExtension === '.js' && isset($file->isEntry) && $file->isEntry === true && (!isset($file->isDynamicEntry) || $file->isDynamicEntry !== true)) {
      $jsfiles .= '<script type="module" src="' . trim($source_url . $file->file) . '"></script>';
    }

    if (!empty($file->css)) {
      foreach ($file->css as $cssFile) {
        $cssfiles .= '<link rel="stylesheet" href="' . $source_url . $cssFile . '" />';
      }
    }
  }
}

header('Content-type: text/html; charset=utf-8');
// This forces Siteground to disable its dynamic caching default which does not work for Routegadget
// since response contents may change even if URL is the same (e.g. start-up config info)
header('Cache-Control: no-cache');

?>
<!DOCTYPE html>
<html lang="en">
<?php include 'app/html/head.html'; ?>
<?php include 'app/html/body.html'; ?>

</html>