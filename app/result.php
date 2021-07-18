<?php
class result
{
    public static function getResultsForEvent($eventid)
    {
        //utils::rg2log("Get results for event ".$eventid);
        $output = array();
        $comments = 0;
        $text = array();
        // @ suppresses error report if file does not exist
        if (($handle = @fopen(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
                if (count($data) >= 5) {
                    // remove null comments
                    if (!self::isDefaultComment($data[4])) {
                        $text[$comments]["resultid"] = $data[1];
                        $text[$comments]["comments"] = self::formatComments($data[4]);
                        $comments++;
                    }
                }
            }
            fclose($handle);
        }
        $codes = array();
        // initialise empty to deal with corrupt results files that occur sometimes
        $variant = array();
        if (event::isScoreEvent($eventid)) {
            // read control locations visited: this includes start and finish
            if (($handle = @fopen(KARTAT_DIRECTORY."ratapisteet_".$eventid.".txt", "r")) !== false) {
                $row = 0;
                while (($data = fgetcsv($handle, 0, "|")) !== false) {
                    $x = array();
                    $y = array();
                    $tempcodes = array();
                    // field is N separated and then comma separated
                    $pairs = explode("N", $data[1]);
                    for ($j = 0; $j < count($pairs); $j++) {
                        $xy = explode(";", $pairs[$j]);
                        // some courses seem to have nulls at the end so just ignore them
                        if ($xy[0] != "") {
                            $x[$j] = 1 * $xy[0];
                            // make it easier to draw map
                            $y[$j] = -1 * $xy[1];
                            // needs to be a string for javascript
                            $tempcodes[$j] = strval($j);
                        }
                    }
                    $variant[$row] = $data[0];
                    $xpos[$row] = $x;
                    $ypos[$row] = $y;
                    $codes[$row] = $tempcodes;
                    $sentalready[$row] = false;
                    $row++;
                }
                fclose($handle);
            }
            // read control codes visited
            if (($handle = @fopen(KARTAT_DIRECTORY."hajontakanta_".$eventid.".txt", "r")) !== false) {
                // if file exists then we can delete the old codes list and get the real one
                unset($codes);
                $codes = array();
                $row = 0;
                while (($data = fgetcsv($handle, 0, "|")) !== false) {
                    $allcodes =  explode("_", $data[2]);
                    // add start at beginning of array
                    array_unshift($allcodes, "S");
                    // add finish at end of array
                    array_push($allcodes, "F");
                    $codes[$row] = $allcodes;
                    $row++;
                }
                fclose($handle);
            }
        }
        // @ suppresses error report if file does not exist
        if (($handle = @fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", "r")) !== false) {
            $row = 0;
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
                $detail = array();
                $resultid = intval($data[0]);
                $courseid = intval($data[1]);
                // protect against corrupt/invalid files
                // skip this record and go to next line
                if (($resultid < 1) || ($courseid < 1)) {
                    continue;
                }
                $detail["resultid"] = $resultid;
                $detail["courseid"] = $courseid;
                $detail["coursename"] = utils::encode_rg_input($data[2]);
                $detail["name"] = trim(utils::encode_rg_input($data[3]));
                $detail["starttime"] = intval($data[4]);
                $detail["position"] = '';
                $detail["status"] = 'ok';
                // look for RG2 extra fields in dbid
                $databaseid = utils::encode_rg_input($data[5]);
                $pos = strpos($databaseid, "_#");
                if ($pos !== false) {
                    $extras = explode("#", substr($databaseid, $pos + 2));
                    if (count($extras) == 2) {
                        $detail["position"] = $extras[0];
                        $detail["status"] = $extras[1];
                    }
                }
                // score event check should be redundant but see issue #159
                if (($data[6] != "") && event::isScoreEvent($eventid)) {
                    $detail["variant"] = intval($data[6]);
                    for ($i = 0; $i < count($variant); $i++) {
                        // only send course details the first time they occur: makes response a lot smaller for big (Jukola!) relays
                        if ($variant[$i] == $data[6]) {
                            if (!$sentalready[$i]) {
                                $detail["scorex"] = $xpos[$i];
                                $detail["scorey"] = $ypos[$i];
                                $detail["scorecodes"] = $codes[$i];
                                $sentalready[$i] = true;
                            }
                        }
                    }
                }
                list($detail["time"], $detail["secs"]) = utils::tidyTime($data[7]);
                // trim trailing ;which create null fields when expanded
                $temp = rtrim($data[8], ";");
                // split array at ;and force to integers
                $detail["splits"] = array_map('intval', explode(";", $temp));
                //$detail["comments"] = "";
                for ($i = 0; $i < $comments; $i++) {
                    if ($detail["resultid"] == $text[$i]["resultid"]) {
                        $detail["comments"] = $text[$i]["comments"];
                    }
                }
                $output[$row] = $detail;
                $row++;
            }
            fclose($handle);
        }

        if (!event::hasResults($eventid)) {
          // event with no results so need to sort times and add positions
          // a lot easier to do this here in one place rather than when adding and deleting results
          // avoids multiple rewrites of full results file plus need to manage route deletion
          usort($output, "self::sortResultsByCourseThenTime");
          $pos = 0;
          $ties = 0;
          $oldsecs = -1;
          $courseid = -1;
          for ($i = 0; $i < count($output); $i++) {
            if ($courseid !== $output[$i]["courseid"]) {
              // new course so reset
              $pos = 1;
              $courseid = $output[$i]["courseid"];
              $ties = 0;
              $oldsecs = -1;
            } else {
              // same course so check for ties
              if ($oldsecs === $output[$i]["secs"]) {
                $ties++;
              } else {
                $pos = $pos + 1 + $ties;
              }
            }
            $output[$i]["position"] = $pos;
            $oldsecs = $output[$i]["secs"];
          }
        }
        return $output;
    }

    public static function formatComments($inputComments)
    {
        // replace carriage return and line break codes
        $comments = utils::encode_rg_input($inputComments);
        // RG1 uses #cr##nl# and #nl# to allow saving to text file
        $comments = str_replace("#cr##nl#", "\n", $comments);
        $comments = str_replace("#nl#", "\n", $comments);
        $comments = str_replace("<br>", "\n", $comments);
        return $comments;
    }

    private static function isDefaultComment($comment)
    {
        // returns true if the comment matches a list of possible default comments
        // add new strings as necessary
        // #310 would be better to read these from the language file but that is
        // quite a lot of effort so keep adding here for now and put a filter on
        // the front end as well
        $defaults = array('Type your comment', 'Dein Kommentar', 'Kirjoita kommentti',
   'Kirjoita kommentit tähän', 'Votre commentaire', 'Kommenter',
   'Scrivi un tuo commento');
        for ($i = 0; $i < count($defaults); $i++) {
            if (strcmp($defaults[$i], $comment) == 0) {
                return true;
            }
        }
        return false;
    }

    public static function updateResults($eventid, $data){

		$date = date("Y-m-dTHis");
        $write["status_msg"] = "";
        
        utils::rg2log("Updating result files for ".$eventid.". Old data will have datestamp: ".$date.".txt");


        //Archive old kilpailijat file
        rename(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt",
        KARTAT_DIRECTORY."kilpailijat_".$eventid."_rm_".$date.".txt");


		// create new kilpailijat file: results
		for ($i = 0; $i < count($data->results); $i++) {
		    $a = $data->results[$i];

			// save position and status if we got them
			if (isset($a->position)) {
				$position = $a->position;
			} else {
				$position = '';
			}
			if (isset($a->status)) {
				$status = utils::abbreviateStatus($a->status);
			} else {
				$status = '';
			}

			// course provided by json is actually result class - get correct course name
			// based on mapping file, and load to txt file if not "Do not save"
			$coursename = "";
			$courseid = "";
            $fh = fopen(KARTAT_DIRECTORY."mappings_".$eventid.".txt", 'r');
            while ($oldrow = fgets($fh)) {
                $row = explode("|", $oldrow);
                if (utils::encode_rg_output($a->course) == $row[0]) {
                    $coursename = $row[1];
                    $courseid = $row[2]; 
                    break;
				}
			}

			if($coursename !== "Do not save"){
				$result = ($i + 1)."|".trim($courseid)."|".utils::encode_rg_output($coursename);
				$result .= "|".utils::encode_rg_output(trim($a->name))."|".$a->starttime."|";
				// abusing dbid to save status and position
				$result .= utils::encode_rg_output($a->dbid)."_#".$position."#".$status;
				$result .= "|".$a->variantid."|".$a->time."|".$a->splits.PHP_EOL;
				file_put_contents(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", $result, FILE_APPEND);
			}
		}


        // Get orig and new resultid so we can replace them in comments and routes files
        // 1|1|C2|Bridget Anderson|35700|121_#1#OK||00:51:36|

        $kilpailijat = array();

        $fh = fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid."_rm_".$date.".txt", 'r');
        while ($oldrow = fgets($fh)) {

            $old = explode("|", $oldrow);

            $fh = fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", 'r');
            while ($newrow = fgets($fh)) {

                $new = explode("|", $newrow);

                if ($new[3] == $old[3] && $new[2] == $old[2]){

                    $row = array();
                    $row["origresultid"] = $old[0];
                    $row["newresultid"] = $new[0];
                    $row["origcourseid"] = $old[1];
                    $row["newcourseid"] = $new[1];
                    $row["coursename"] = $old[2];
                    $row["name"] = $old[3];
                    $kilpailijat[] = $row;

                    break;
                }
            }
        }

        // Add GPS routes from old file
        $fh = fopen(KARTAT_DIRECTORY."kilpailijat_".$eventid."_rm_".$date.".txt", 'r');
        while ($oldrow = fgets($fh)) {

            $old = explode("|", $oldrow);
            
            if (strpos($old[3], 'GPS ') !== false){

                // Get the current Id for the non-GPS record
                        
                foreach ($kilpailijat as $kil){

                    if (substr($old[3], 5) == $kil["name"] && 
                        $old[2] == $kil["coursename"]){
                            
                        $row = array();
                        $row["origresultid"] = $old[0];
                        $row["newresultid"] = GPS_RESULT_OFFSET + $kil["newresultid"];
                        $row["origcourseid"] = $old[1];
                        $row["newcourseid"] = $kil["newcourseid"];
                        $row["coursename"] = $old[2];
                        $row["name"] = $old[3];
                        $kilpailijat[] = $row;

                        $result = $row["newresultid"]."|".$row["newcourseid"]."|".$row["coursename"];
                        $result .= "|".$row["name"]."|".$old[4]."|".$old[5]."|".$old[6]."|".$old[7]."|".$old[8]."|".$old[9];

                        file_put_contents(KARTAT_DIRECTORY."kilpailijat_".$eventid.".txt", $result, FILE_APPEND);

                        break;
                        
                    }
                }
            }
        }

        if (file_exists(KARTAT_DIRECTORY."kommentit_".$eventid.".txt")){

            // Recreate kommentit file
            // Replace old course id and result id with ones from new kilpailijat file
            // Kommentit format:  2|34|Jake Hanson||test

            $updatedfile = array();
            $fh = fopen(KARTAT_DIRECTORY."/kommentit_".$eventid.".txt", 'r');
            while ($oldrow = fgets($fh)) {
                
                $olddata = explode("|", $oldrow);

                foreach ($kilpailijat as $k){
                    if ($k["origresultid"] == $olddata[1]){

                        $row = $k["newcourseid"]."|".$k["newresultid"]."|".$olddata[2]."|".$olddata[3]."|".$olddata[4];

                        $updatedfile[] = $row;

                        break;

                    }
                }
            }

            //Archive old file
            rename(KARTAT_DIRECTORY."kommentit_".$eventid.".txt",
            KARTAT_DIRECTORY."kommentit_".$eventid."_rm_".$date.".txt");

            //Write new file
            file_put_contents(KARTAT_DIRECTORY."kommentit_".$eventid.".txt", $updatedfile);
            utils::rg2log("Updated route comments file ");
        }
        
        if (file_exists(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt")){


            // Recreate merkinnat file
            // Replace old course id and result id with ones from new kilpaijat file
            // Merkinnat format: 2|34|Jake Hanson|null|Semicolon-separated results

            $updatedfile = array();
            $fh = fopen(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt", 'r');
            while ($oldrow = fgets($fh)) {
                    $olddata = explode("|", $oldrow);

                    foreach ($kilpailijat as $k){
                        if ($k["origresultid"] == $olddata[1]){

                            $row = $k["newcourseid"]."|".$k["newresultid"]."|".$olddata[2]."|".$olddata[2]."|".$olddata[4];

                            $updatedfile[] = $row;

                            break;

                        }
                    }
                
            }

            //Archive old file
            rename(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt",
            KARTAT_DIRECTORY."merkinnat_".$eventid."_rm_".$date.".txt");

            //Write updated file
            file_put_contents(KARTAT_DIRECTORY."merkinnat_".$eventid.".txt", $updatedfile);
            utils::rg2log("Updated routes file");

        }

		if ($write["status_msg"] == "") {
		    $write["ok"] = true;
		    $write["status_msg"] = "Results updated.";
		} else {
		    $write["ok"] = false;
		}
		utils::rg2log("Updated results file ");
		return $write;

		utils::unlockDatabase();
    }

    private static function sortResultsByCourseThenTime($a, $b)
    {
      if (intval($a["courseid"]) !== intval($b["courseid"])) {
        return (intval($a["courseid"]) - intval($b["courseid"]));
      }
      return (intval($a["secs"]) - intval($b["secs"]));
    }
}
