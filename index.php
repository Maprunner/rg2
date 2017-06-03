<?php
// version replaced by Gruntfile as part of release
define ('RG2VERSION', '1.4.2');

if (file_exists( dirname(__FILE__) . '/rg2-config.php')) {
  require_once( dirname(__FILE__) . '/rg2-config.php' );
} else {
  echo "Routegadget 2: Configuration file " . dirname(__FILE__) . "/rg2-config.php not found.";
  return;
}

// override allows testing of a local configuration such as c:/xampp/htdocs/rg2
if (file_exists( dirname(__FILE__) . '/rg2-override-config.php')) {
  $override = true;
  require_once ( dirname(__FILE__) . '/rg2-override-config.php');
} else {
  $override = false;
}

if (defined('OVERRIDE_UI_THEME')) {
  $ui_theme = OVERRIDE_UI_THEME;
} else {
  $ui_theme = UI_THEME;
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

if (defined('OVERRIDE_BASE_DIRECTORY')) {
  $json_url = OVERRIDE_BASE_DIRECTORY . "/rg2/rg2api.php";
  if (defined('OVERRIDE_SOURCE_DIRECTORY')) {
    $source_url = OVERRIDE_SOURCE_DIRECTORY . "/rg2";
  } else {
    $source_url = OVERRIDE_BASE_DIRECTORY . "/rg2";
  }
} else {
  $json_url = RG_BASE_DIRECTORY . "/rg2/rg2api.php";
  if (defined('OVERRIDE_SOURCE_DIRECTORY')) {
    $source_url = OVERRIDE_SOURCE_DIRECTORY . "/rg2";
  } else {
    $source_url = RG_BASE_DIRECTORY . "/rg2";
  }
}

if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
  $maps_url = OVERRIDE_KARTAT_DIRECTORY;
} else {
  $maps_url = RG_BASE_DIRECTORY . "/kartat/";
}

// include manager function as parameter for now until we decide the best way forward
if (isset($_GET['manage'])) {
  $manager = TRUE;
  if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
    $manager_url = OVERRIDE_KARTAT_DIRECTORY;
  } else {
    $manager_url = "../kartat/";
  }
  // simple cookie generator! Don't need unique, just need something vaguely random
  $keksi = substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"), 0, 20);
  file_put_contents($manager_url."keksi.txt", $keksi.PHP_EOL);
} else {
  $manager=  FALSE;
}

// include debug function as parameter for now until we decide the best way forward
if (isset($_GET['debug']) || $override) {
  $debug = TRUE;
} else {
  $debug = FALSE;
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
<html>
  <head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <title>Routegadget 2</title>
    <meta name="description" content="View and save route choices for orienteering events">
    <meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1">
    <!-- favicon info -->
    <link rel="apple-touch-icon" sizes="180x180" href='<?php echo $source_url ."/img/apple-touch-icon.png"; ?>'>
    <link rel="icon" type="image/png" href='<?php echo $source_url ."/img/favicon-32x32.png"; ?>' sizes="32x32">
    <link rel="icon" type="image/png" href='<?php echo $source_url ."/img/favicon-16x16.png"; ?>' sizes="16x16">
    <link rel="manifest" href='<?php echo $source_url ."/img/manifest.json"; ?>'>
    <link rel="mask-icon" href='<?php echo $source_url ."/img/safari-pinned-tab.svg"; ?>' color="#5bbad5">
    <meta name="theme-color" content="#ffffff">    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.min.css"; ?>
  <?php if ($debug) { ?>
    <link rel="stylesheet" href='<?php echo $source_url ."/css/rg2.css'>"; ?>
  <?php } else { ?>
    <link rel="stylesheet" href='<?php echo $source_url ."/css/rg2-".RG2VERSION.".min.css'>"; ?>
  <?php } ?>
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/<?php echo $ui_theme; ?>/jquery-ui.min.css">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
  </head>
  <body>
    <!--[if lt IE 7]>
    <p class="chromeframe">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> or <a href="http://www.google.com/chromeframe/?redirect=true">activate Google Chrome Frame</a> to improve your experience.</p>
    <![endif]-->
    <?php include 'html/header.html';?>
    <noscript><h3>You have javascript disabled. Routegadget cannot run. Please update your browser configuration.</h3></noscript>
    <div id="rg2-container">
      <div id="rg2-info-panel">
        <div id="rg2-info-panel-tab-headers">
        <ul>
          <li id="rg2-events-tab">
            <a href="#rg2-event-tab-body">Events</a>
          </li>
          <li id="rg2-courses-tab">
            <a href="#rg2-course-list">Courses</a>
          </li>
          <li id="rg2-results-tab">
            <a href="#rg2-result-list">Results</a>
          </li>
          <li id="rg2-draw-tab">
            <a href="#rg2-draw">Draw</a>
          </li>
          <?php if ($manager) { ?>
          <li id="rg2-login-tab">
            <a href="#rg2-manage-login">Login</a>
          </li>
          <li id="rg2-create-tab">
            <a href="#rg2-manage-create">Add event</a>
          </li>
          <li id="rg2-edit-tab">
            <a href="#rg2-manage-edit">Edit event</a>
          </li>
          <li id="rg2-map-tab">
            <a href="#rg2-manage-map">Add map</a>
          </li>
          <?php } ?>
         </ul>
        </div>
        <div id="rg2-info-panel-tab-body">
        <div id="rg2-event-tab-body">
          <div id="rg2-event-search"></div>
          <div id="rg2-event-list"></div>
        </div>
        <div id="rg2-course-list">
          <div id="rg2-course-table"></div>
        </div>
        <div id="rg2-result-list"></div>
      <div id="rg2-draw">
          <h3 class="no-top-margin" id='rg2-draw-title'>Draw route</h3>
          <div id="rg2-select-course">
           <label for='rg2-course-select'>Select course: </label>
           <select  id="rg2-course-select"></select>
          </div>
          <div id="rg2-select-name">
           <label for='rg2-name-select'>Select name: </label>
           <select id="rg2-name-select"></select>
          </div>
          <div id="rg2-enter-name">
           <div>
              <label for='rg2-name'>Enter name: </label>
             <span id = "rg2-name"><input id="rg2-name-entry" class="pushright" type="text"></span>
           </div>
           <div>
              <label for='rg2-time'>Enter time (mm:ss): </label>
             <span id = "rg2-time"><input  id="rg2-time-entry" class="pushright" type="text"></span>
           </div>
          </div>
          <div>
           <textarea id="rg2-new-comments"></textarea>
          </div>
        <div>
          <input type=checkbox id="btn-align-map"><label for="btn-align-map">Align map to next control</label>
        </div>
       <div class="singlerow">
         <button class="singlerowitem" id="btn-three-seconds">+3 sec</button>
         <button class="singlerowitem" id="btn-undo">Undo</button>
         <button class="singlerowitem" id="btn-save-route">Save</button>
         <button class="singlerowitem" id="btn-reset-drawing">Reset</button>
       </div>
       <hr class="rg2-hr">
       <h3 id='rg2-load-gps-title'>Load GPS file (GPX or TCX)</h3>
       <div id="rg2-select-gps-file">
         <input type='file' accept='.gpx, .tcx' id='rg2-load-gps-file'>
       </div>
       <div class="singlerow">
         <button class = "singlerowitem" id="btn-autofit-gps">Autofit</button>
         <div id="rg2-offset-spinner" class="singlerowitem">
           <input id="spn-offset" />
         </div>
         <button  class = "singlerowitem" id="btn-undo-gps-adjust">Undo</button>
       </div>
       <div class="singlerow">
         <button id="btn-save-gps-route">Save GPS route</button>
       </div>
       <hr class="rg2-hr">
       <div>
         <input type=checkbox id="btn-move-all"><label for="btn-move-all">Move track and map together (or right click-drag)</label>
       </div>
       <hr class="rg2-hr">
       <div class="rg2-gps-text">
        <span id="draw-text-1">Left click to add/lock/unlock a handle.></span>
        <ul><li id="draw-text-2">Green: draggable</li>
        <li id="draw-text-3">Red: locked</li></ul>
        <span id="draw-text-4">Right click to delete a handle.</span>
        <br><span id="draw-text-5">Drag a handle to adjust track around locked point(s).</span>
       </div>
    </div>
    <?php if ($manager) {include  'html/manager.html'; } ?>
       </div>
      </div>
      <?php include 'html/animation.html'; ?>
      <?php include 'html/options.html'; ?>
      <?php include 'html/misc.html'; ?>
    </div>
<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>
<?php if ($debug) { ?>
<script src='<?php echo $source_url . "/js/rg2.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/rg2ui.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/rg2input.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/rg2getjson.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/config.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/canvas.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/events.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/event.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/results.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/result.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/gpstrack.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/controls.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/control.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/courses.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/course.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/draw.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/animation.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/runner.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/map.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/utils.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/plugins.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/handles.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/lib/he.js"; ?>'></script>
<?php } else { ?>
<script src='<?php echo $source_url . "/js/rg2-".RG2VERSION.".min.js"; ?>'></script>
<?php } ?>
<?php if ($manager) { ?>
  <?php if ($debug) { ?>
<script src='<?php echo $source_url . "/js/resultparser.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/resultparsercsv.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/resultparseriofv2.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/resultparseriofv3.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/courseparser.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/managerui.js"; ?>'></script>
<script src='<?php echo $source_url . "/js/manager.js"; ?>'></script>
  <?php } else {?>
<script src='<?php echo $source_url . "/js/rg2manager-".RG2VERSION.".min.js"; ?>'></script>
  <?php } ?>
<script src='<?php echo $source_url . "/js/lib/proj4js-compressed.js"; ?>'></script>
  <?php } ?>
<script type="text/javascript">
var rg2Config = {
json_url: "<?php echo $json_url; ?>",
maps_url: "<?php echo $maps_url; ?>",
lang_url: "<?php echo $source_url.'/lang/'; ?>",
header_colour: "<?php echo $header_colour; ?>",
header_text_colour: "<?php echo $header_text_colour; ?>",
<?php if (defined('SPLITSBROWSER_DIRECTORY')) { ?>
enable_splitsbrowser: true,
<?php } else { ?>
enable_splitsbrowser: false,
<?php } ?>
<?php if ($manager) { ?>
keksi: "<?php echo $keksi; ?>",
<?php if (defined('EPSG_CODE')) { ?>
epsg_code: "<?php echo EPSG_CODE; ?>",
epsg_params: "<?php echo EPSG_PARAMS; ?>",
<?php } ?>
<?php } ?>
languages: {},
start_language: "<?php echo $lang; ?>"
};
<?php echo "$(document).ready(rg2.init);" ?>
</script>
</body>
</html>
