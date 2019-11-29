<?php
// only needed if using codeception for testing
// error_reporting(E_ALL);
// define('C3_CODECOVERAGE_ERROR_LOG_FILE', '/tests/_output/c3_error.log');
// include 'c3.php';
// define('MY_APP_STARTED', true);

require(dirname(__FILE__) . '/app/user.php');
require(dirname(__FILE__) . '/app/utils.php');

// version replaced by Gruntfile as part of release
define('RG2VERSION', '1.5.5');
define("RG_LOG_FILE", dirname(__FILE__)."/log/rg2log.txt");

if (file_exists(dirname(__FILE__) . '/rg2-config.php')) {
    require_once(dirname(__FILE__) . '/rg2-config.php');
} else {
    echo "Routegadget 2: Configuration file " . dirname(__FILE__) . "/rg2-config.php not found.";
    return;
}

if (defined('UI_THEME')) {
    $ui_theme = UI_THEME;
} else {
    $ui_theme = 'base';
}

if (isset($_GET['debug'])) {
    $debug = TRUE;
  } else {
    $debug = FALSE;
  }

if (defined('HEADER_COLOUR')) {
    $header_colour = HEADER_COLOUR;
} else {
    $header_colour = '#002bd9';
}
if (defined('HEADER_TEXT_COLOUR')) {
    $header_text_colour = HEADER_TEXT_COLOUR;
} else {
    $header_text_colour = '#ffffff';
}

$json_url = RG_BASE_DIRECTORY . "/rg2/rg2api.php";
if (defined('OVERRIDE_SOURCE_DIRECTORY')) {
  $source_url = OVERRIDE_SOURCE_DIRECTORY . "/rg2";
} else {
  $source_url = RG_BASE_DIRECTORY . "/rg2";
}

// messy but works OK for now
// Overrides work OK on a local server which is what they are intended for
if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
    $debug = true;
    $maps_dir = OVERRIDE_KARTAT_DIRECTORY;
    $maps_url = OVERRIDE_KARTAT_DIRECTORY;
} else {
    $maps_dir = "../kartat/";
    $maps_url = RG_BASE_DIRECTORY . "/kartat/";
}
define('KARTAT_DIRECTORY', $maps_dir);

// save grief when initial set-up is wrong...
if (!file_exists($maps_dir)) {
  echo "Routegadget 2: Kartat directory " . $maps_dir ." not found.";
  return;
}

// include manager function as parameter for now until we decide the best way forward
if (isset($_GET['manage'])) {
    $manager = true;
    $keksi = user::generateNewKeksi();
} else {
    $manager=  false;
}

// include language file if requested
if (isset($_GET['lang'])) {
    $lang = $_GET['lang'];
} else {
    if ((defined('START_LANGUAGE'))) {
        $lang = START_LANGUAGE;
    } else {
        $lang = "en";
    }
}

header('Content-type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html lang="en">
<?php include 'html/head.html'; ?>

<body>
  <?php include 'html/header.html';?>
  <noscript>
    <h3>You have javascript disabled. Routegadget cannot run. Please update your browser configuration.</h3>
  </noscript>
  <div id="rg2-container">
    <?php include 'html/infopanel.html'; ?>
    <?php include 'html/animation.html'; ?>
    <?php include 'html/options.html'; ?>
    <?php include 'html/misc.html'; ?>
  </div>
  <?php include 'html/script.html'; ?>
</body>

</html>