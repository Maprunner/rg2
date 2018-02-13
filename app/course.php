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
        // @ suppresses error report if file does not exist
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
                // ignore first field: it is an index
                $x = array();
                $y = array();
                $dummycodes = array();
                // field is N separated and then semicolon separated
                $pairs = explode("N", $data[1]);
                for ($j = 0; $j < count($pairs); $j++) {
                    $xy = explode(";", $pairs[$j]);
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
            fclose($handle);
        }

        $row = 0;
        // set up details for each course
        if (($handle = @fopen(KARTAT_DIRECTORY."sarjat_".$eventid.".txt", "r")) !== false) {
            while (($data = fgetcsv($handle, 0, "|")) !== false) {
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
                $output[$row] = $detail;
                $row++;
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
}
