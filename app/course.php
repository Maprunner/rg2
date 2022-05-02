<?php
class course
{
    public static function getCoursesForEvent($eventid)
    {
        $output = array();
        $row = 0;
        // extract control codes
        $controlsFound = false;
        $controls = array();
        $xpos = array();
        $ypos = array();
        $dummycontrols = array();
        $excludedControls = array();
        // read excluded controls for each course
        // allows for road crossings with 0 splits
        if (($handle = @fopen(KARTAT_DIRECTORY."exclude_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
              $controls = array();
              $times = array(); 
              $detail = array();
              $detail["courseid"] = $data[0];
              $detail["type"] = intval($data[1]);
              for ($i = 2; $i < count($data); $i++) {
                $split = explode(",", $data[$i]);
                $controls[] = intval($split[0]);
                $times[] = intval($split[1]);
              }
              $detail["controls"] = $controls;
              $detail["allowed"] = $times;
              $excludedControls[] = $detail;
            }
            fclose($handle);
        }

        // read control codes for each course
          if (($handle = @fopen(KARTAT_DIRECTORY."sarjojenkoodit_".$eventid.".txt", "r")) !== false) {
            $controlsFound = true;
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
              // ignore first field: it is an index
              $codes = array();
              for ($j = 1; $j < count($data); $j++) {
                $codes[$j - 1] = $data[$j];
              }
              $controls[$row] = $codes;
              $row++;
            }
          fclose($handle);
        }

        // extract control locations based on map co-ords
        if (($handle = @fopen(KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt", "r")) !== false) {
            $row = 0;
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
              // protect against empty rows: shouldn't be there but...
              if (count($data) > 1) {
                // ignore first field: it is an index
                $x = array();
                $y = array();
                $dummycodes = array();
                // field is N separated and then semicolon separated
                $pairs = explode("N", $data[1]);
                for ($j = 0; $j < count($pairs); $j++) {
                    $xy = explode(";", $pairs[$j]);
                    // some events (mainly historic?) have invalid list of controls
                    // which means an event won't load once created
                    // the next two checks at least allow you to load the event to see what has happened
                    if (count($xy) < 2) {
                      $xy[1] = 1;
                    }
                    if (!is_numeric($xy[1])) {
                      $xy[1] = 1;
                    }
                    // some courses seem to have nulls at the end so just ignore them
                    if ($xy[0] != "") {
                        $dummycodes[$j] = self::getDummyCode($pairs[$j]);
                        $x[$j] = 1 * $xy[0];
                        // make it easier to draw map
                        $y[$j] = -1 * $xy[1];
                    }
                }
                $xpos[$row] = $x;
                $ypos[$row] = $y;
                $dummycontrols[$row] = $dummycodes;
                $row++;
              }
            }
            fclose($handle);
        }

        $row = 0;
        // set up details for each course
        if (($handle = @fopen(KARTAT_DIRECTORY."sarjat_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
              // protect against empty rows: shouldn't be there but...
              if (count($data) > 1) {
                $detail = array();
                $detail["courseid"] = intval($data[0]);
                $detail["name"] = utils::encode_rg_input($data[1]);
                // sarjojenkoodit quite often seems to have things missing for old RG1 events so protect against it
                if (($controlsFound) && (count($controls) > $row)) {
                    $detail["codes"] = $controls[$row];
                } else {
                    $detail["codes"] = $dummycontrols[$row];
                }
                // some RG1 events seem to have unused courses which cause trouble
                if (count($xpos) > $row) {
                    $detail["xpos"] = $xpos[$row];
                    $detail["ypos"] = $ypos[$row];
                } else {
                    $detail["xpos"] = array();
                    $detail["ypos"] = array();
                }
                $detail["exclude"] = array();
                $detail["allowed"] = array();
                $detail["excludeType"] = 0;
                for ($j = 0; $j < count($excludedControls); $j++) {
                  if ($excludedControls[$j]["courseid"] === $data[0]) {
                    $detail["exclude"] = $excludedControls[$j]["controls"];
                    $detail["allowed"] = $excludedControls[$j]["allowed"];
                    $detail["excludeType"] = $excludedControls[$j]["type"];
                  }
                }
                $output[$row] = $detail;
                $row++;
              }
            }
            fclose($handle);
        }
        return $output;
    }

    private static function getDummyCode($code)
    {
        // create dummy control codes if the results didn't include any
        static $codes = array();
        static $count = 0;
        $dummycode = 0;
        for ($i = 0; $i < $count; $i++) {
            if ($codes[$i] == $code) {
                $dummycode = $i + 1;
            }
        }
        if ($dummycode == 0) {
            $codes[$count] = $code;
            $count++;
            $dummycode = $count;
        }
        //utils::rg2log($code.' becomes '.$dummycode);
        // force to a string since it helps elsewhere
        // and it shows that these are dummy values
        return 'X'.$dummycode;
    }
    
    public static function saveExcludeDetails($eventid, $exclude)
    {
      $ok = true;
      $exclude = trim($exclude);
      if ($exclude == "") {
        return $ok;
      }
      $save = "";
      $rows = explode("\n", $exclude);
      for ($row = 0; $row < count($rows); $row++) {
        $fields = explode("|", $rows[$row]);
        // remove blank lines
        if ((count($fields) === 1) && ($fields[0] === "")) {
          continue;
        }
        if (count($fields) < 3) {
          $ok = false;
          break;
        }
        if (!is_numeric($fields[0])) {
          $ok = false;
          break;
        }
        if (($fields[1] !== "1") && ($fields[1] !== "2")){
          $ok = false;
          break;
        }
        for ($j = 2; $j < count($fields); $j++) {
          $control = explode(",", $fields[$j]);
          if (count($control) !== 2) {
            $ok = false;
            break;
          }
        }
        $save .= $rows[$row]."\n";
      }
      if ($ok) {
        $file = KARTAT_DIRECTORY."exclude_".$eventid.".txt";
        $ok = file_put_contents($file, $save);
      }
      return $ok;
    }
}
