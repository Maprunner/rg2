<?php
  error_reporting(E_ALL);
  // only needed if using codeception for testing
  // include 'c3.php';
  // define('MY_APP_STARTED', true);
  require(dirname(__FILE__) . '/app/course.php');
  require(dirname(__FILE__) . '/app/event.php');
  require(dirname(__FILE__) . '/app/map.php');
  require(dirname(__FILE__) . '/app/result.php');
  require(dirname(__FILE__) . '/app/route.php');
  require(dirname(__FILE__) . '/app/splitsbrowser.php');
  require(dirname(__FILE__) . '/app/user.php');
  require(dirname(__FILE__) . '/app/utils.php');

  require_once(dirname(__FILE__) . '/rg2-config.php');

  define("RG_LOG_FILE", dirname(__FILE__)."/log/rg2log.txt");

  if (defined('OVERRIDE_KARTAT_DIRECTORY')) {
      $kartat = OVERRIDE_KARTAT_DIRECTORY;
  } else {
      $kartat = "../kartat/";
  }

  // The default encoding used by Route Gadget 2
  define('RG2_ENCODING', 'UTF-8');

  // The input encoding from files in kartat directory
  // note: backward compatibility for old RG_INPUT_ENCODING configuration
  if (!defined('RG_INPUT_ENCODING')) {
    define('RG_INPUT_ENCODING', RG2_ENCODING);
  }

  // version replaced by Gruntfile as part of release
  define('RG2VERSION', '1.10.1');
  define('KARTAT_DIRECTORY', $kartat);
  define('LOCK_DIRECTORY', dirname(__FILE__)."/lock/saving/");
  define('CACHE_DIRECTORY', $kartat."cache/");
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

  if ($_SERVER['REQUEST_METHOD'] == 'GET') {
      handleGetRequest($type, $id);
  } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
      if ($type == 'uploadmapfile') {
          map::uploadMapFile();
      } else {
          handlePostRequest($type, $id);
      }
  } else {
      header('HTTP/1.1 405 Method Not Allowed');
      header('Allow: GET, POST');
  }

function handlePostRequest($type, $eventid)
{
    $data = json_decode(file_get_contents('php://input'));
    $write = array();
    if (utils::lockDatabase() !== false) {
        if (($type != 'addroute') && ($type != 'deletemyroute')) {
            $loggedIn = user::logIn($data);
        } else {
            // don't need to log in to add a route or delete your own
            $loggedIn = true;
        }
        if ($loggedIn) {
            //utils::rg2log($type);
            switch ($type) {
      case 'addroute':
        $write = route::addNewRoute($eventid, $data);
        @unlink(CACHE_DIRECTORY."all_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

      case 'addmap':
        $write = map::addNewMap($data);
        break;

      case 'createevent':
        $write = event::addNewEvent($data);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

      case 'editevent':
        $write = event::editEvent($eventid, $data);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

      case 'deleteevent':
        $write = event::deleteEvent($eventid);
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."all_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
       break;

      case 'deleteunusedmaps':
        $write = map::deleteUnusedMaps($data);
        // shouldn't impact the cache but just delete to be safe
        @unlink(CACHE_DIRECTORY."events.json");
        @unlink(CACHE_DIRECTORY."all_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
       break;

      case 'deleteroute':
        // this is the manager delete function
        $write = route::deleteRoute($eventid);
        @unlink(CACHE_DIRECTORY."all_".$eventid.".json");
        @unlink(CACHE_DIRECTORY."stats.json");
        break;

        case 'deletemyroute':
        // this is the user delete function
        if (route::canDeleteMyRoute($eventid, $data)) {
            $write = route::deleteRoute($eventid);
            @unlink(CACHE_DIRECTORY."all_".$eventid.".json");
            @unlink(CACHE_DIRECTORY."stats.json");
        } else {
            $write["status_msg"] = "Delete failed";
            $write["ok"] = false;
        }
        break;

      case 'login':
        // handled by default before we got here
        $write["ok"] = true;
        $write["status_msg"] = "Login successful";
        break;

      default:
        utils::rg2log("Post request not recognised: ".$type);
        $write["status_msg"] = "Request not recognised: ".$type;
        $write["ok"] = false;
        break;
      }
        } else {
            $write["ok"] = false;
            $write["status_msg"] = "Incorrect user name or password";
        }
        utils::unlockDatabase();
    } else {
        $write["status_msg"] = "File lock error";
        $write["ok"] = false;
    }

    $write["keksi"] = user::generateNewKeksi();
    $write["POST_size"] = $_SERVER['CONTENT_LENGTH'];

    header("Content-type: application/json");
    $write["API version"] = RG2VERSION;
    echo json_encode($write);
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
  case 'fix':
    event::fixResults($id);
    $output = json_encode("Results fixed for event ".$id);
    break;
  case 'aresplitsbroken':
    $answer = event::areSplitsBroken();
    $output = json_encode($answer);
    break;
  case 'fixsplits':
    event::fixSplits($id, true);
    $output = json_encode("Splits fixed for event ".$id);
    break;
  default:
    utils::rg2log("Get request not recognised: ".$type.", ".$id);
    $output = json_encode("Request not recognised.");
    break;
  }
    if ($type == 'splitsbrowser') {
        echo $output;
    } else {
        // output JSON data
        header("Content-type: application/json");
        echo "{\"data\":" .$output. "}";
    }
}

function validateCache($id)
{
    // check nothing has happened that could invalidate the cache if it exists
    // RG2 should tidy up for itself but
    // 1) delete cache if this is a new version of the API just in case
    // 2) delete cache if associated txt files have changed: probably someone using RG1
    if (!file_exists(KARTAT_DIRECTORY.'/cache')) {
        //utils::rg2log("No cache directory");
        return;
    }

    $apitimestamp = filemtime(__FILE__);
    //utils::rg2log("API file mod date ".$apitimestamp);
    $cachedirtimestamp = filemtime(CACHE_DIRECTORY.'.');
    //utils::rg2log("Cache dir mod date ".$cachedirtimestamp);
    if ($apitimestamp >= $cachedirtimestamp) {
        utils::rg2log("Flush cache: API script file has been updated");
        @array_map('unlink', glob(CACHE_DIRECTORY."*.json"));
        return;
    }
    // catches events added via RG1 manager, which has been seen to happen
    // delete everything just to be sure
    if (is_file(KARTAT_DIRECTORY.'kisat.txt')) {
        if (filemtime(KARTAT_DIRECTORY.'kisat.txt') >= $cachedirtimestamp) {
            utils::rg2log("Flush cache: kisat.txt file has been updated");
            @array_map('unlink', glob(CACHE_DIRECTORY."*.json"));
            return;
        }
    }

    // catches routes added via RG1 to an event with RG2 installed which is conceivable but very unlikely
    // base decision on kilpailijat only which seems reasonable enough
    if ((is_file(CACHE_DIRECTORY.'results_'.$id.'.json')) && is_file(KARTAT_DIRECTORY.'kilpailijat_'.$id.'.txt')) {
        if (filemtime(KARTAT_DIRECTORY.'kilpailijat_'.$id.'.txt') >= filemtime(CACHE_DIRECTORY.'results_'.$id.'.json')) {
            utils::rg2log("Flush cache: RG1 route has been added");
            @array_map('unlink', glob(CACHE_DIRECTORY."*.json"));
            return;
        }
    }

    //utils::rg2log("Cache OK");
}
