<?php
class utils
{
    public static function addVersion($name, $data)
    {
        $a[$name] = $data;
        $a['API version'] = RG2VERSION;
        return json_encode($a);
    }

    public static function rg2log($msg)
    {
        if (defined('RG_LOG_FILE')) {
            if (! ini_get('date.timezone')) {
                date_default_timezone_set('GMT');
            }
            error_log(date("c", time())."|".$msg.PHP_EOL, 3, RG_LOG_FILE);
            if (filesize(RG_LOG_FILE) > 500000) {
                rename(RG_LOG_FILE, RG_LOG_FILE."-".date("Y-m-d-His", time()));
            }
        }
    }

    public static function lockDatabase()
    {
        // lock directory version based on http://docstore.mik.ua/oreilly/webprog/pcook/ch18_25.htm
        // but note mkdir returns TRUE if directory already exists!
        $locked = false;

        // tidy up from possible locking errors
        if (is_dir(LOCK_DIRECTORY)) {
            // if lock directory is more than a few seconds old it wasn't deleted properly, so we'll delete it ourselves
            // not sure exactly how time changes work, but we can live with a possible twice
            // a year problem since locking is probably almost never needed
            if ((time() - filemtime(LOCK_DIRECTORY)) > 15) {
                self::unlockDatabase();
            }
        }
        if (is_dir(LOCK_DIRECTORY)) {
            // locked already by someone else
      //rg2log("Directory exists ".date("D M j G:i:s T Y", filemtime(LOCK_DIRECTORY)));
        } else {
            // try to lock it ourselves
            //rg2log("Trying to lock");
            $locked = mkdir(LOCK_DIRECTORY, 0777);
        }
        $tries = 0;
        while (!$locked && ($tries < 5)) {
            // wait 500ms up to 5 times trying to get a lock
            usleep(500000);
            if (is_dir(LOCK_DIRECTORY)) {
                // locked already by someone else
                $locked = false;
            } else {
                // try to lock it ourselves
                $locked = mkdir(LOCK_DIRECTORY, 0777);
            }
            $tries++;
            //rg2log("Lock attempt ".$tries);
        }
        //rg2log("Lock status ".$locked);
        return $locked;
    }

    public static function unlockDatabase()
    {
        // ignore any errors but try to tidy up everything
        @rmdir(LOCK_DIRECTORY);
    }

    public static function tidyNewComments($inputComments)
    {
        $comments = trim($inputComments);
        // remove HTML tags: probably not needed but do it anyway
        $comments = strip_tags($comments);
        // remove line breaks and keep compatibility with RG1
        $comments = str_replace("\r", "", $comments);
        $comments = str_replace("\n", "#cr##nl#", $comments);
        $comments = utils::encode_rg_output($comments);
        return $comments;
    }

    public static function tidyTime($in)
    {
        // takes what should be a time as mm:ss or hh:mm:ss and tidies it up
        // remove ".:" and "::" which RG1 can generate when adding results
        $t = str_replace('.:', ':', $in);
        $t = str_replace('::', ":", $t);
        // remove leading 0:
        if (substr($t, 0, 2) === '0:') {
            $t = substr($t, 2);
        }
        // correct seconds for missing leading 0 which RG1 can generate from Emit. e.g 25:9 becomes 25:09
        $secs = substr($t, -2);
        if (substr($secs, 0, 1) ===  ':') {
            $t = substr_replace($t, '0', -1, 0);
        }
        return $t;
    }

    public static function getAngle($x1, $y1, $x2, $y2)
    {
        $angle = atan2($y2 - $y1, $x2 - $x1);
        if ($angle < 0) {
            $angle = $angle + (2 * M_PI);
        }
        return $angle;
    }

    public static function getLineEnds($x1, $y1, $x2, $y2)
    {
        $offset = 20;
        $angle = self::getAngle($x1, $y1, $x2, $y2);
        $c1x = (int) ($x1 + ($offset * cos($angle)));
        $c1y = (int) ($y1 + ($offset * sin($angle)));
        $c2x = (int) ($x2 - ($offset * cos($angle)));
        $c2y = (int) ($y2 - ($offset * sin($angle)));
        return array($c1x, $c1y, $c2x, $c2y);
    }

    public static function abbreviateStatus($text)
    {
        // mappings for ResultStatus in IOF XML V3 and V2.0.3
        switch ($text) {
    case 'OK':
      return 'OK';
    case 'MissingPunch':
      return 'mp';
    case 'MisPunch':
      return 'mp';
    case 'Disqualified':
      return 'dsq';
    case 'DidNotFinish':
      return 'dnf';
    case 'OverTime':
      return 'ot';
    case 'SportingWithdrawal':
      return 'swd';
    case 'SportingWithdr':
      return 'swd';
    case 'NotCompeting':
      return 'nc';
    case 'DidNotStart':
      return 'dns';
    default:
      return $text;
  }
    }

    // Note: convert encoding read from kartat files to encoding use in rg2 browser
    // Handle the encoding for input data if kartat directory files are not using RG2_ENCODING encoding
    public static function encode_rg_input($input_str)
    {
        $encoded = '';
        if (RG_FILE_ENCODING != RG2_ENCODING) {
            //
            $encoded = @iconv(RG_FILE_ENCODING, RG2_ENCODING . '//TRANSLIT//IGNORE', $input_str);
        } else {
            // this removes any non-RG2_ENCODING characters that are stored locally, normally by an original Routegadget installation
            $encoded = mb_convert_encoding($input_str, RG2_ENCODING, RG2_ENCODING);
        }
        if (!$encoded) {
            //
            $encoded = "";
        } else {
            // ENT_COMPAT is just a default flag: ENT_SUBSTITUTE is PHP 5.4.0+
            $encoded = htmlentities($encoded, ENT_COMPAT, RG2_ENCODING);
        }
        return $encoded;
    }

    // Note: convert encoding from rg2 browser to encoding use for kartat files
    // Handle the encoding for output data if kartat directory files are not using UTF-8 encoding
    //
    public static function encode_rg_output($output_str)
    {
        $encoded = '';
        if (RG_FILE_ENCODING != RG2_ENCODING && mb_detect_encoding($output_str, RG2_ENCODING, true)) {
            // convert if kartat files doesn't use RG2_ENCODING and output_str is encoded using RG2_ENCODING
            $encoded = @iconv(RG2_ENCODING, RG_FILE_ENCODING . '//TRANSLIT//IGNORE', $output_str);
        } else {
            // write output as is, if kartat files are useing RG2_ENCODING or input couldn't not be converted from RG2_ENCODING to RG_FILE_ENCODING
            $encoded = $output_str;
        }
        if (!$encoded) {
            //
            $encoded = "";
        }
        return $encoded;
    }
}
