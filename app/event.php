<?php
class event
{
  public static function getEvents()
  {
    $output = [];
    if (file_exists(CACHE_DIRECTORY . "events.json")) {
      $output = file_get_contents(CACHE_DIRECTORY . "events.json");
    } else {
      // FALSE means don't include stats in output
      $output = self::getAllEvents(false);
      @file_put_contents(CACHE_DIRECTORY . "events.json", $output);
    }
    return $output;
  }
  public static function getStats()
  {
    $output = [];
    if (file_exists(CACHE_DIRECTORY . "stats.json")) {
      $output = file_get_contents(CACHE_DIRECTORY . "stats.json");
    } else {
      // TRUE means do include stats in output
      $output = self::getAllEvents(true);
      @file_put_contents(CACHE_DIRECTORY . "stats.json", $output);
    }
    return $output;
  }

  public static function getEvent($id)
  {
    $output = [];
    if (file_exists(CACHE_DIRECTORY . "all_" . $id . ".json")) {
      $output = file_get_contents(CACHE_DIRECTORY . "all_" . $id . ".json");
    } else {
      $all["courses"] = course::getCoursesForEvent($id);
      $all["results"] = result::getResultsForEvent($id);
      $all["routes"] = route::getRoutesForEvent($id);
      $all["API version"] = RG2VERSION;
      $output = json_encode($all);
      @file_put_contents(CACHE_DIRECTORY . "all_" . $id . ".json", $output);
    }

    return $output;
  }

  private static function getAllEvents($includeStats)
  {
    $output = [];
    $referenced = 0;
    $maps = [];
    if (($handle = @fopen(KARTAT_DIRECTORY . "kartat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        if (count($data) == 14) {
          list($A, $B, $C, $D, $E, $F) = map::generateWorldFile($data);
          // make sure it worked OK
          if ($E != 0 && $F != 0) {
            $maps[$referenced]["mapid"] = intval($data[0]);
            $maps[$referenced]["A"] = $A;
            $maps[$referenced]["D"] = $D;
            $maps[$referenced]["B"] = $B;
            $maps[$referenced]["E"] = $E;
            $maps[$referenced]["C"] = $C;
            $maps[$referenced]["F"] = $F;
            $referenced++;
          }
        }
      }
      fclose($handle);
    }

    $row = 0;
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        $detail = [];
        $fields = count($data);
        if ($fields < 7) {
          // not enough fields to be a valid line
          continue;
        }
        $detail["id"] = intval($data[0]);
        $detail["mapid"] = intval($data[1]);
        if (file_exists(KARTAT_DIRECTORY . $detail["mapid"] . ".gif")) {
          $detail["suffix"] = "gif";
        }
        for ($i = 0; $i < $referenced; $i++) {
          if ($detail["mapid"] == $maps[$i]["mapid"]) {
            $detail["A"] = $maps[$i]["A"];
            $detail["B"] = $maps[$i]["B"];
            $detail["C"] = $maps[$i]["C"];
            $detail["D"] = $maps[$i]["D"];
            $detail["E"] = $maps[$i]["E"];
            $detail["F"] = $maps[$i]["F"];
          }
        }

        $detail["format"] = utils::getEventFormat(
          intval($detail["id"]),
          $data[2]
        );
        // Issue #11: found a stray &#39; in a SUFFOC file
        $name = utils::encode_rg_input($data[3]);
        $detail["name"] = str_replace("&#39;", "'", $name);
        // and stray &amp;#39; in a CHIG file
        $detail["name"] = str_replace("&amp;#39;", "'", $name);
        $detail["date"] = $data[4];
        if ($fields > 5) {
          $detail["club"] = utils::encode_rg_input($data[5]);
        } else {
          $detail["club"] = "";
        }
        if ($fields > 6) {
          $detail["type"] = $data[6];
        } else {
          $detail["type"] = "X";
        }
        $detail["locked"] = false;
        if ($fields > 7) {
          // Trailing character indicates event is locked: remove before displaying comments.
          $detail["comment"] = rtrim(
            result::formatComments($data[7]),
            EVENT_LOCKED_INDICATOR
          );
          if (substr($data[7], -1) == EVENT_LOCKED_INDICATOR) {
            $detail["locked"] = true;
          }
        } else {
          $detail["comment"] = "";
        }
        if ($includeStats) {
          // avoid reading big results file into memory: has been seen to cause trouble
          if (
            ($resulthandle = @fopen(
              KARTAT_DIRECTORY . "kilpailijat_" . $detail["id"] . ".txt",
              "r"
            )) !== false
          ) {
            $count = 0;
            while (($data = fgetcsv($resulthandle, 0, "|")) !== false) {
              // don't double-count GPS results
              if (count($data) > 0) {
                if ($data[0] < GPS_RESULT_OFFSET) {
                  $count++;
                } else {
                  continue;
                }
              }
            }
            fclose($resulthandle);
            $detail["results"] = $count;
          } else {
            $detail["results"] = 0;
          }
          if (
            file_exists(KARTAT_DIRECTORY . "sarjat_" . $detail["id"] . ".txt")
          ) {
            $detail["courses"] = count(
              file(KARTAT_DIRECTORY . "sarjat_" . $detail["id"] . ".txt")
            );
          } else {
            $detail["courses"] = 0;
          }
          if (
            file_exists(
              KARTAT_DIRECTORY . "kommentit_" . $detail["id"] . ".txt"
            )
          ) {
            $detail["routes"] = count(
              file(KARTAT_DIRECTORY . "kommentit_" . $detail["id"] . ".txt")
            );
          } else {
            $detail["routes"] = 0;
          }
        }

        $output[$row] = $detail;
        $row++;
      }
      fclose($handle);
    }
    usort($output, "self::sortEventsByDate");
    return utils::addVersion("events", $output);
  }

  public static function editEvent($eventid, $newdata)
  {
    $write["status_msg"] = "";
    $updatedfile = [];
    $oldfile = file(KARTAT_DIRECTORY . "kisat.txt");
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] == $eventid) {
        $data[3] = utils::encode_rg_output($newdata->name);
        $data[4] = $newdata->eventdate;
        $data[5] = utils::encode_rg_output($newdata->club);
        $data[6] = $newdata->type;
        $data[7] = utils::tidyNewComments($newdata->comments);
        if ($newdata->locked) {
          $data[7] = $data[7] . EVENT_LOCKED_INDICATOR;
        }
        $row = "";
        // reconstruct |-separated row
        for ($i = 0; $i < count($data); $i++) {
          if ($i > 0) {
            $row .= "|";
          }
          $row .= $data[$i];
        }
        $row .= PHP_EOL;
      }
      $updatedfile[] = $row;
    }
    $status = file_put_contents(KARTAT_DIRECTORY . "kisat.txt", $updatedfile);

    if (!$status) {
      $write["status_msg"] .= " Save error for kisat.txt.";
    }
    if ($write["status_msg"] == "") {
      $write["ok"] = true;
      $write["status_msg"] = "Event detail updated";
      utils::rg2log("Event updated|" . $eventid);
    } else {
      $write["ok"] = false;
    }

    return $write;
  }

  public static function addNewEvent($data)
  {
    $format = self::setEventFormat($data->format);
    $hasResults = $format == FORMAT_NORMAL || $format == FORMAT_SCORE_EVENT;
    $isScoreEvent =
      $format == FORMAT_SCORE_EVENT || $format == FORMAT_SCORE_EVENT_NO_RESULTS;
    $write["status_msg"] = "";
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r+")) !== false) {
      // read to end of file to find last entry
      $oldid = 0;
      while (($olddata = fgetcsv($handle, 0, "|")) !== false) {
        // blank rows come back as a single null array entry so ignore them
        if (count($olddata) > 1) {
          // ids should be increasing anyway, but just in case...
          if (intval($olddata[0]) > $oldid) {
            $oldid = intval($olddata[0]);
          }
        }
      }
      $newid = $oldid + 1;
    } else {
      // create new kisat file
      $newid = 1;
      $handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "w+");
    }
    $name = utils::encode_rg_output($data->name);
    $club = utils::encode_rg_output($data->club);
    $comments = utils::tidyNewComments($data->comments);
    // Add trailing character to show event is locked
    if ($data->locked) {
      $comments = $comments . EVENT_LOCKED_INDICATOR;
    }
    $newevent =
      $newid .
      "|" .
      $data->mapid .
      "|" .
      $data->format .
      "|" .
      $name .
      "|" .
      $data->eventdate .
      "|" .
      $club .
      "|" .
      $data->level .
      "|" .
      $comments;
    $newevent .= PHP_EOL;
    $write["newid"] = $newid;
    $status = fwrite($handle, $newevent);
    if (!$status) {
      $write["status_msg"] = "Save error for kisat. ";
    }
    @fflush($handle);
    @fclose($handle);

    // create new sarjat file: course names
    $courses = "";
    for ($i = 0; $i < count($data->courses); $i++) {
      $courses .=
        $data->courses[$i]->courseid .
        "|" .
        utils::encode_rg_output($data->courses[$i]->name) .
        PHP_EOL;
    }
    file_put_contents(
      KARTAT_DIRECTORY . "sarjat_" . $newid . ".txt",
      $courses,
      FILE_APPEND
    );

    // create new sarjojenkoodit file: course control lists
    for ($i = 0; $i < count($data->courses); $i++) {
      $controls = $data->courses[$i]->courseid;
      for ($j = 0; $j < count($data->courses[$i]->codes); $j++) {
        $controls .= "|" . $data->courses[$i]->codes[$j];
      }
      $controls .= PHP_EOL;
      file_put_contents(
        KARTAT_DIRECTORY . "sarjojenkoodit_" . $newid . ".txt",
        $controls,
        FILE_APPEND
      );
    }

    // create new ratapisteet file: control locations
    if ($isScoreEvent && count($data->results) > 0) {
      // score event with results so save variants
      for ($i = 0; $i < count($data->variants); $i++) {
        $controls = $data->variants[$i]->id . "|";
        for ($j = 0; $j < count($data->variants[$i]->x); $j++) {
          $controls .=
            $data->variants[$i]->x[$j] .
            ";-" .
            $data->variants[$i]->y[$j] .
            "N";
        }
        $controls .= PHP_EOL;
        file_put_contents(
          KARTAT_DIRECTORY . "ratapisteet_" . $newid . ".txt",
          $controls,
          FILE_APPEND
        );
      }
    } else {
      // normal event or score event without results so save courses
      for ($i = 0; $i < count($data->courses); $i++) {
        $controls = $data->courses[$i]->courseid . "|";
        for ($j = 0; $j < count($data->courses[$i]->x); $j++) {
          $controls .=
            $data->courses[$i]->x[$j] . ";-" . $data->courses[$i]->y[$j] . "N";
        }
        $controls .= PHP_EOL;
        file_put_contents(
          KARTAT_DIRECTORY . "ratapisteet_" . $newid . ".txt",
          $controls,
          FILE_APPEND
        );
      }
    }

    // create new hajontakanta file: control sequences for course variants
    // originally for score/relay only, but may be usable for butterflies in future
    if ($isScoreEvent && count($data->results) > 0) {
      // score event so save variants
      for ($i = 0; $i < count($data->variants); $i++) {
        $controls =
          $data->variants[$i]->id . "|" . $data->variants[$i]->name . "|";
        // data includes start and finish which we don't want
        for ($j = 1; $j < count($data->variants[$i]->codes) - 1; $j++) {
          if ($j > 1) {
            $controls .= "_";
          }
          $controls .= $data->variants[$i]->codes[$j];
        }
        $controls .= PHP_EOL;
        file_put_contents(
          KARTAT_DIRECTORY . "hajontakanta_" . $newid . ".txt",
          $controls,
          FILE_APPEND
        );
      }
    } else {
      // normal event or score event without results so save courses
      for ($i = 0; $i < count($data->courses); $i++) {
        $controls =
          $data->courses[$i]->courseid . "|" . $data->courses[$i]->name . "|";
        // data includes start and finish which we don't want
        for ($j = 1; $j < count($data->courses[$i]->codes) - 1; $j++) {
          if ($j > 1) {
            $controls .= "_";
          }
          $controls .= $data->courses[$i]->codes[$j];
        }
        $controls .= PHP_EOL;
        file_put_contents(
          KARTAT_DIRECTORY . "hajontakanta_" . $newid . ".txt",
          $controls,
          FILE_APPEND
        );
      }
    }

    // create new radat file: course drawing: RG2 uses this for score event control locations
    $course = "";
    if ($isScoreEvent && count($data->results) > 0) {
      // score event: one row per variant
      for ($i = 0; $i < count($data->variants); $i++) {
        $a = $data->variants[$i];
        $finish = count($a->x) - 1;
        $course .=
          $a->id .
          "|" .
          $a->courseid .
          "|" .
          utils::encode_rg_output($a->name) .
          "|2;";
        $course .= $a->x[$finish] . ";-" . $a->y[$finish] . ";0;0N";
        // loop from first to last control
        for ($j = 1; $j < $finish; $j++) {
          // control circle
          $course .= "1;" . $a->x[$j] . ";-" . $a->y[$j] . ";0;0N";
          // line between controls
          list($x1, $y1, $x2, $y2) = utils::getLineEnds(
            $a->x[$j],
            $a->y[$j],
            $a->x[$j - 1],
            $a->y[$j - 1]
          );
          $course .= "4;" . $x1 . ";-" . $y1 . ";" . $x2 . ";-" . $y2 . "N";
          // text: just use 20 offset for now: RG1 and RGJS seem happy
          $course .=
            "3;" .
            ($a->x[$j] + 20) .
            ";-" .
            ($a->y[$j] + 20) .
            ";" .
            $j .
            ";0N";
        }
        // start triangle
        $side = 20;
        $angle = utils::getAngle($a->x[0], $a->y[0], $a->x[1], $a->y[1]);
        $angle = $angle + M_PI / 2;
        $x0 = (int) ($a->x[0] + $side * sin($angle));
        $y0 = (int) ($a->y[0] - $side * cos($angle));
        $x1 = (int) ($a->x[0] + $side * sin($angle + (2 * M_PI) / 3));
        $y1 = (int) ($a->y[0] - $side * cos($angle + (2 * M_PI) / 3));
        $x2 = (int) ($a->x[0] + $side * sin($angle - (2 * M_PI) / 3));
        $y2 = (int) ($a->y[0] - $side * cos($angle - (2 * M_PI) / 3));

        $course .= "4;" . $x0 . ";-" . $y0 . ";" . $x1 . ";-" . $y1 . "N";
        $course .= "4;" . $x1 . ";-" . $y1 . ";" . $x2 . ";-" . $y2 . "N";
        $course .= "4;" . $x2 . ";-" . $y2 . ";" . $x0 . ";-" . $y0 . "N";

        $course .= PHP_EOL;
      }
    } else {
      // normal event or score event without results so save courses: one row per course
      for ($i = 0; $i < count($data->courses); $i++) {
        $a = $data->courses[$i];
        $finish = count($a->x) - 1;
        $course .=
          $a->courseid .
          "|" .
          $a->courseid .
          "|" .
          utils::encode_rg_output($a->name) .
          "|2;";
        $course .= $a->x[$finish] . ";-" . $a->y[$finish] . ";0;0N";
        // loop from first to last control
        for ($j = 1; $j < $finish; $j++) {
          // control circle
          $course .= "1;" . $a->x[$j] . ";-" . $a->y[$j] . ";0;0N";
          // line between controls
          list($x1, $y1, $x2, $y2) = utils::getLineEnds(
            $a->x[$j],
            $a->y[$j],
            $a->x[$j - 1],
            $a->y[$j - 1]
          );
          $course .= "4;" . $x1 . ";-" . $y1 . ";" . $x2 . ";-" . $y2 . "N";
          // text: just use 20 offset for now: RG1 and RGJS seem happy
          $course .=
            "3;" .
            ($a->x[$j] + 20) .
            ";-" .
            ($a->y[$j] + 20) .
            ";" .
            $j .
            ";0N";
        }
        // start triangle
        $side = 20;
        $angle = utils::getAngle($a->x[0], $a->y[0], $a->x[1], $a->y[1]);
        $angle = $angle + M_PI / 2;
        $x0 = (int) ($a->x[0] + $side * sin($angle));
        $y0 = (int) ($a->y[0] - $side * cos($angle));
        $x1 = (int) ($a->x[0] + $side * sin($angle + (2 * M_PI) / 3));
        $y1 = (int) ($a->y[0] - $side * cos($angle + (2 * M_PI) / 3));
        $x2 = (int) ($a->x[0] + $side * sin($angle - (2 * M_PI) / 3));
        $y2 = (int) ($a->y[0] - $side * cos($angle - (2 * M_PI) / 3));

        $course .= "4;" . $x0 . ";-" . $y0 . ";" . $x1 . ";-" . $y1 . "N";
        $course .= "4;" . $x1 . ";-" . $y1 . ";" . $x2 . ";-" . $y2 . "N";
        $course .= "4;" . $x2 . ";-" . $y2 . ";" . $x0 . ";-" . $y0 . "N";

        $course .= PHP_EOL;
      }
    }
    file_put_contents(KARTAT_DIRECTORY . "radat_" . $newid . ".txt", $course);

    // create new kilpailijat file: results
    for ($i = 0; $i < count($data->results); $i++) {
      $a = $data->results[$i];
      // save position and status if we got them
      if (isset($a->position)) {
        $position = $a->position;
      } else {
        $position = "";
      }
      if (isset($a->status)) {
        $status = utils::abbreviateStatus($a->status);
      } else {
        $status = "";
      }
      $result =
        $i + 1 . "|" . $a->courseid . "|" . utils::encode_rg_output($a->course);
      $result .=
        "|" .
        utils::encode_rg_output(trim($a->name)) .
        "|" .
        $a->starttime .
        "|";
      // abusing dbid to save status and position
      $result .=
        utils::encode_rg_output($a->dbid) . "_#" . $position . "#" . $status;
      $result .=
        "|" . $a->variantid . "|" . $a->time . "|" . $a->splits . PHP_EOL;
      file_put_contents(
        KARTAT_DIRECTORY . "kilpailijat_" . $newid . ".txt",
        $result,
        FILE_APPEND
      );
    }

    if ($write["status_msg"] == "") {
      $write["ok"] = true;
      $write["status_msg"] = "Event created.";
    } else {
      $write["ok"] = false;
    }
    utils::rg2log("Added new event ");
    return $write;
  }

  public static function deleteEvent($eventid)
  {
    $write["status_msg"] = "";
    $updatedfile = [];
    $oldfile = file(KARTAT_DIRECTORY . "kisat.txt");
    foreach ($oldfile as $row) {
      $data = explode("|", $row);
      if ($data[0] != $eventid) {
        $updatedfile[] = $row;
      }
    }
    $status = file_put_contents(KARTAT_DIRECTORY . "kisat.txt", $updatedfile);

    if (!$status) {
      $write["status_msg"] .= " Save error for kisat.";
    }

    // rename all associated files but don't worry about errors
    // safer than deleting them since you can always add the event again
    $files = [
      "kilpailijat_",
      "kommentit_",
      "hajontakanta_",
      "merkinnat_",
      "radat_",
      "ratapisteet_",
      "sarjat_",
      "sarjojenkoodit_",
    ];
    foreach ($files as $file) {
      @rename(
        KARTAT_DIRECTORY . $file . $eventid . ".txt",
        KARTAT_DIRECTORY . "deleted_" . $file . $eventid . ".txt"
      );
    }

    if ($write["status_msg"] == "") {
      $write["ok"] = true;
      $write["status_msg"] = "Event deleted";
      utils::rg2log("Event deleted|" . $eventid);
    } else {
      $write["ok"] = false;
    }

    return $write;
  }

  private static function setEventFormat($incomingFormat)
  {
    // RG2 supports format 4 but old Routegadget doesn't, so pretend it was type 2
    // messy but should be OK (!?)
    if ($incomingFormat == FORMAT_SCORE_EVENT_NO_RESULTS) {
      // create file to show what is going on so we can send correct response to events request
      // file contents irrelevant at the moment..
      file_put_contents(
        KARTAT_DIRECTORY . "format_" . $newid . ".txt",
        "format=4",
        FILE_APPEND
      );
      return FORMAT_NORMAL_NO_RESULTS;
    }
    return $incomingFormat;
  }

  public static function getEventName($eventid)
  {
    $event_name = "Unknown event";
    $events = file(KARTAT_DIRECTORY . "kisat.txt");
    foreach ($events as $event) {
      $data = explode("|", $event);
      if (intval($data[0]) == $eventid) {
        $event_name = utils::encode_rg_input($data[3]) . " on " . $data[4];
      }
    }
    return $event_name;
  }

  public static function isScoreEvent($eventid)
  {
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        if ($data[0] == $eventid) {
          if ($data[2] == 3) {
            return true;
          } else {
            return false;
          }
        }
      }
    }
    return false;
  }

  public static function hasResults($eventid)
  {
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        if ($data[0] == $eventid) {
          if ($data[2] == 2) {
            return false;
          } else {
            return true;
          }
        }
      }
    }
    return false;
  }

  private static function sortEventsByDate($a, $b)
  {
    return strcmp($a["date"], $b["date"]);
  }

  public static function fixResults($id)
  {
    // modifies splits when they have been corrupted by Excel/Emit
    // times over 24 minutes get treated as hours and minutes, not minutes and seconds
    // e.g 96540 should be 26m 49s, not 26h 49m
    // called as rg2api?id=xx&type=fix
    if (utils::lockDatabase() !== false) {
      $updatedfile = [];
      $oldfile = file(KARTAT_DIRECTORY . "kilpailijat_" . $id . ".txt");
      foreach ($oldfile as $row) {
        $data = explode("|", $row);
        // modify splits in data[8]
        // trim trailing ; which create null fields when expanded
        if ($data[8]) {
          $temp = rtrim($data[8], ";");
          // split array at ; and force to integers
          $splits = array_map("intval", explode(";", $temp));
          // adjust back to proper time
          for ($i = 0; $i < count($splits); $i++) {
            if ($splits[$i] >= 3600 * 24) {
              $mins = intval($splits[$i] / 3600);
              $secs = ($splits[$i] - $mins * 3600) / 60;
              $splits[$i] = $mins * 60 + $secs;
            }
          }
          // reconstruct ;-separated list
          $data[8] = "";
          for ($i = 0; $i < count($splits); $i++) {
            $data[8] .= $splits[$i] . ";";
          }
          // don't want the terminating ;
          $data[8] = substr_replace($data[8], "", -1);
        }
        $row = "";
        // reconstruct |-separated row
        for ($i = 0; $i < count($data); $i++) {
          if ($i > 0) {
            $row .= "|";
          }
          $row .= $data[$i];
        }
        if (count($data) < 10) {
          $row .= PHP_EOL;
        }
        $updatedfile[] = $row;
      }
      $status = file_put_contents(
        KARTAT_DIRECTORY . "kilpailijat_" . $id . ".txt",
        $updatedfile
      );
      utils::unlockDatabase();
    }
  }
  public static function areSplitsBroken() 
  {
    $answer = "Splits broken for events: ";
    if (($handle = @fopen(KARTAT_DIRECTORY . "kisat.txt", "r")) !== false) {
      while (($data = fgetcsv($handle, 0, "|")) !== false) {
        if (count($data) > 2) {
          if ($data[2] == "1") {
            $id = intval($data[0]);
            if (self::fixSplits($id, false)) {
              $answer .= $id . ": ";
            }
          }
        }
      }
    }
    return $answer;
  }
  public static function fixSplits($id, $doUpdate) 
  {
    // modifies splits when they have been produced from non-compliant IOF XML files such as eTiming
    // which include a split time for the finish
    // 100;200;300;400;400 needs to become 100;200;300;400
    // called as rg2api?id=xx&type=fixsplits
    $fixNeeded = false;
    if (utils::lockDatabase() !== false) {
      $updatedfile = array();
      $oldfile = @file(KARTAT_DIRECTORY."kilpailijat_".$id.".txt");
      $coursecount = 0;
      $courses = array();
      $controls = array();
      
      // read control codes for each course: use hajontakanta if it exists
      if (($handle = @fopen(KARTAT_DIRECTORY."hajontakanta_".$id.".txt", "r")) !== false) {
        while (($data = fgetcsv($handle, 0, "|")) !== false) {
          $courses[$coursecount] = $data[1];
          $codes =  explode("_", $data[2]);
          $controls[$coursecount] = count($codes);
          $coursecount++;
        }
        fclose($handle);
      }
      if ($oldfile) {
        foreach ($oldfile as $row) {
          $data = explode("|", $row);
          // modify splits in data[8]
          $expectedsplits = 0;
          if ($data[2]) {
            for ($i = 0; $i < count($courses); $i++) {
              if ($data[2] === $courses[$i]) {
                // expect to see a split per control plus one for the finish in this internal representation
                $expectedsplits = $controls[$i] + 1;
              }
            }
          }
          if (($expectedsplits > 1) && ($data[8])) {
            $temp = rtrim($data[8], ";");
            // split array at ; and force to integers
            $splits = array_map('intval', explode(";", $temp));
            $count = count($splits);
            // only adjust if we have exactly one too many: may miss a few edge cases but makes it safer overall
            if ($count === ($expectedsplits + 1)) {
              // remove penultimate split since just for fun eTiming can also manage
              // to produce a valid result with no splits times giving 0;0;..0;0;1234
              // and we want to keep the final split
              $splits[$count - 2] = $splits[$count - 1];
              // reconstruct ;-separated list
              $data[8] = "";
              for ($i = 0; $i < $expectedsplits; $i++) {
                $data[8] .= $splits[$i].";";
              }
              // don't want the terminating ;
              $data[8] = substr_replace($data[8] ,"", -1);
              $fixNeeded = true;
            }
          }
          $row = "";
          // reconstruct |-separated row
          for ($i = 0; $i < count($data); $i++) {
            if ($i > 0) {
              $row .= "|";
            }
            $row .= $data[$i];
          }
          $row .= PHP_EOL;
          $updatedfile[] = $row;
        }
      }
      if ($doUpdate) {
        $status = file_put_contents(KARTAT_DIRECTORY."kilpailijat_".$id.".txt", $updatedfile);
      }
      utils::unlockDatabase();
      return $fixNeeded;
    }
  }
}