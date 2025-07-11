<?php
error_reporting(E_ALL);
require(dirname(__FILE__) . '/app/course.php');
require(dirname(__FILE__) . '/app/event.php');
require(dirname(__FILE__) . '/app/language.php');
require(dirname(__FILE__) . '/app/map.php');
require(dirname(__FILE__) . '/app/result.php');
require(dirname(__FILE__) . '/app/route.php');
require(dirname(__FILE__) . '/app/splitsbrowser.php');
require(dirname(__FILE__) . '/app/user.php');
require(dirname(__FILE__) . '/app/utils.php');

require_once(dirname(__FILE__) . '/rg2-config.php');

define("RG_LOG_FILE", dirname(__FILE__) . "/log/rg2log.txt");
define("LANG_DIRECTORY", dirname(__FILE__) . "/lang/");

if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
  $kartat = OVERRIDE_KARTAT_DIRECTORY;
} else {
  $kartat = "../kartat/";
}

// whether or not to create map files to support the other Routegadget
if (!defined('CREATE_JPG_MAP_FILES')) {
  define('CREATE_JPG_MAP_FILES', true);
}

// The default encoding used by Route Gadget 2
define('RG2_ENCODING', 'UTF-8');

// The input encoding from files in kartat directory
// note: backward compatibility for old RG_INPUT_ENCODING configuration
if (!defined('RG_INPUT_ENCODING')) {
  define('RG_INPUT_ENCODING', RG2_ENCODING);
}

// version replaced by Gruntfile as part of release
define('RG2VERSION', '2.2.1');
define('KARTAT_DIRECTORY', $kartat);
define('LOCK_DIRECTORY', dirname(__FILE__) . "/lock/saving/");
define('CACHE_DIRECTORY', $kartat . "cache/");
define('GPS_RESULT_OFFSET', 50000);
define('GPS_INTERVAL', 3);
define('FORMAT_NORMAL', 1);
define('FORMAT_NORMAL_NO_RESULTS', 2);
define('FORMAT_SCORE_EVENT', 3);
define('FORMAT_SCORE_EVENT_NO_RESULTS', 4);
// added to end of event comments to show event is read-only
define('EVENT_LOCKED_INDICATOR', '_');

if (isset($_GET['type'])) {
  $type = $_GET['type'];
} else {
  $type = 'unknown';
}
if (isset($_GET['id'])) {
  $id = $_GET['id'];
} else {
  $id = 0;
}

switch($_SERVER['REQUEST_METHOD']) {
  case "POST":
    if ($type === "uploadmapfile") {
      $data = new stdClass();
      $data->x = $_POST["x"];
      $data->user = $_POST["user"];
      $data->filename = $_POST["name"];
    } else {
      $data = json_decode(file_get_contents('php://input'));
    }
    // utils::rg2log("Post data ". $type . " " . json_encode($data));
    if (($type === 'addroute') || ($type === 'deletemyroute')) {
      // normal user function doesn't need to log in
      $loggedIn = true;

    } else {
      // manager function being called
      user::startSession(false);
      $loggedIn = user::logIn($data);
    }
    if ($loggedIn) {
      handlePostRequest($type, $id, $data);
    } else {
      $reply = array();
      $reply["ok"] = false;
      $reply["status_msg"] = "Incorrect user name or password";
      sendPostReply($reply);
    }
    break;

  case "GET":
    handleGetRequest($type, $id);
    break;

  default:
    header('HTTP/1.1 405 Method Not Allowed');
    header('Allow: GET, POST');
    $reply = array();
    $reply["ok"] = false;
    $reply["status_msg"] = "Method not allowed";
    header("Content-type: application/json");
    echo json_encode($reply);
  }
  exit;

function handlePostRequest($type, $eventid, $data)
{
  $reply = array();
  if (utils::lockDatabase() !== false) {
    utils::rg2log($type);
    switch ($type) {
      case 'addroute':
        $reply = route::addNewRoute($eventid, $data);
        @unlink(CACHE_DIRECTORY . "all_" . $eventid . ".json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'addmap':
        $reply = map::addNewMap($data);
        break;

      case 'uploadmapfile':
        $reply = map::uploadMapFile($data);
        break;

      case 'createevent':
        $reply = event::addNewEvent($data);
        @unlink(CACHE_DIRECTORY . "events.json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'editevent':
        $reply = event::editEvent($eventid, $data);
        @unlink(CACHE_DIRECTORY . "events.json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'deleteevent':
        $reply = event::deleteEvent($eventid);
        @unlink(CACHE_DIRECTORY . "events.json");
        @unlink(CACHE_DIRECTORY . "all_" . $eventid . ".json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'deleteunusedmaps':
        $reply = map::deleteUnusedMaps($data);
        // shouldn't impact the cache but just delete to be safe
        @unlink(CACHE_DIRECTORY . "events.json");
        @unlink(CACHE_DIRECTORY . "all_" . $eventid . ".json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'deleteroute':
        // this is the manager delete function
        $reply = route::deleteRoute($eventid);
        @unlink(CACHE_DIRECTORY . "all_" . $eventid . ".json");
        @unlink(CACHE_DIRECTORY . "stats.json");
        break;

      case 'deletemyroute':
        // this is the user delete function
        if (route::canDeleteMyRoute($eventid, $data)) {
          $reply = route::deleteRoute($eventid);
          @unlink(CACHE_DIRECTORY . "all_" . $eventid . ".json");
          @unlink(CACHE_DIRECTORY . "stats.json");
        } else {
          $reply["status_msg"] = "Delete failed";
          $reply["ok"] = false;
        }
        break;

      case 'login':
        // handled by default before we got here
        $reply["ok"] = true;
        $reply["status_msg"] = "Login successful";
        break;

      default:
        utils::rg2log("Post request not recognised: " . $type);
        $reply["status_msg"] = "Request not recognised: " . $type;
        $reply["ok"] = false;
        break;
    }
    utils::unlockDatabase();

  } else {
    
    $reply["status_msg"] = "File lock error";
    $reply["ok"] = false;
  }

  sendPostReply($reply);
}

function sendPostReply($reply) {
  $reply["POST_size"] = $_SERVER['CONTENT_LENGTH'];
  header("Content-type: application/json");
  $reply["API version"] = RG2VERSION;
  echo json_encode($reply);
}

function handleGetRequest($type, $id)
{
  validateCache($id);
  $output = array();
  //utils::rg2log("Type ".$type."|ID ".$id);
  switch ($type) {
    case 'events':
      $output = event::getEvents();
      break;
    case 'stats':
      $output = event::getStats();
      break;
    case 'event':
      $output = event::getEvent($id);
      break;
    case 'maps':
      $output = map::getMaps();
      break;
    case 'splitsbrowser':
      $output = splitsbrowser::getSplitsbrowser($id);
      break;
    case 'lang':
      if (isset($_GET['lang'])) {
        $lang = $_GET['lang'];
      } else {
        $lang = 0;
      }
      $output = language::getLanguage($lang);
      break;
    case 'removeRedundantJPG':
      $result = map::removeRedundantJPG();
      $output = json_encode($result);
      break;
    case 'fix':
      event::fixResults($id);
      $output = json_encode("Results fixed for event " . $id);
      break;
    case 'aresplitsbroken':
      $answer = event::areSplitsBroken();
      $output = json_encode($answer);
      break;
    case 'fixsplits':
      event::fixSplits($id, true);
      $output = json_encode("Splits fixed for event " . $id);
      break;
    default:
      utils::rg2log("Get request not recognised: " . $type . ", " . $id);
      $output = json_encode("Request not recognised.");
      break;
  }
  if ($type == 'splitsbrowser') {
    echo $output;
  } else {
    // output JSON data
    header("Content-type: application/json");
    echo "{\"data\":" . $output . "}";
  }
}

function validateCache($id)
{
  // check nothing has happened that could invalidate the cache if it exists
  // RG2 should tidy up for itself but
  // 1) delete cache if this is a new version of the API just in case
  // 2) delete cache if associated txt files have changed: probably someone using RG1
  if (!file_exists(KARTAT_DIRECTORY . '/cache')) {
    //utils::rg2log("No cache directory");
    return;
  }

  $apitimestamp = filemtime(__FILE__);
  //utils::rg2log("API file mod date ".$apitimestamp);
  $cachedirtimestamp = filemtime(CACHE_DIRECTORY . '.');
  //utils::rg2log("Cache dir mod date ".$cachedirtimestamp);
  if ($apitimestamp >= $cachedirtimestamp) {
    utils::rg2log("Flush cache: API script file has been updated");
    @array_map('unlink', glob(CACHE_DIRECTORY . "*.json"));
    return;
  }
  // catches events added via RG1 manager, which has been seen to happen
  // delete everything just to be sure
  if (is_file(KARTAT_DIRECTORY . 'kisat.txt')) {
    if (filemtime(KARTAT_DIRECTORY . 'kisat.txt') >= $cachedirtimestamp) {
      utils::rg2log("Flush cache: kisat.txt file has been updated");
      @array_map('unlink', glob(CACHE_DIRECTORY . "*.json"));
      return;
    }
  }

  // catches routes added via RG1 to an event with RG2 installed which is conceivable but very unlikely
  // base decision on kilpailijat only which seems reasonable enough
  if ((is_file(CACHE_DIRECTORY . 'results_' . $id . '.json')) && is_file(KARTAT_DIRECTORY . 'kilpailijat_' . $id . '.txt')) {
    if (filemtime(KARTAT_DIRECTORY . 'kilpailijat_' . $id . '.txt') >= filemtime(CACHE_DIRECTORY . 'results_' . $id . '.json')) {
      utils::rg2log("Flush cache: RG1 route has been added");
      @array_map('unlink', glob(CACHE_DIRECTORY . "*.json"));
      return;
    }
  }

  //utils::rg2log("Cache OK");
}
