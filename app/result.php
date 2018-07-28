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
                $detail["status"] = '';
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
                $detail["time"] = utils::tidyTime($data[7]);
                ;
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
}
