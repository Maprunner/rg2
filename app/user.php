<?php
class user
{
  public static function logIn($data)
  {
    // utils::rg2log("Log in ". session_id() . " ". session_encode() . " " . json_encode($data));
    
    $ok = true;
    $userdetails = isset($data->x) ? self::extractString($data->x) : "anon";
    $user= isset($data->user) ? $data->user : "anon";

    $session_logged_in = isset($_SESSION['loggedin']) ? $_SESSION['loggedin'] : false;
    $session_user = isset($_SESSION['user']) ? $_SESSION['user'] : "";
    
    // if this user is already logged in then we don't need to do anything
    if ($session_logged_in && ($session_user === $user)) {
      // utils::rg2log("Session already logged in for ". $user);
      return $ok;
    }
    // utils::rg2log("Session not yet logged in for ". $user);
    // not logged in so we need to check the user details
    if (file_exists(KARTAT_DIRECTORY . "rg2userinfo.txt")) {
      $saved_userdetails = trim(file_get_contents(KARTAT_DIRECTORY . "rg2userinfo.txt"));
      if (!password_verify($userdetails, $saved_userdetails)) {
        // utils::rg2log("User details incorrect: " . $userdetails );
        $ok = false;
        $_SESSION['user'] = "";
      } else {
        // utils::rg2log("User details correct: " . $userdetails );
        $_SESSION['user'] = $user;  
      }
    } else {
      // new account being set up: rely on JS end to force a reasonable name/password
      $temp = password_hash($userdetails, PASSWORD_DEFAULT);
      utils::rg2log("Creating new account for " . $userdetails);
      file_put_contents(KARTAT_DIRECTORY . "rg2userinfo.txt", $temp . PHP_EOL);
      $_SESSION['user'] = $user;
    }
    $_SESSION['loggedin'] = $ok;
    return $ok;
  }

  // Mickey Mouse function to extract user name and password
  // just avoids plain text transmission for now so a bit better than RG1
  private static function extractString($data)
  {
    $str = "";
    for ($i = 0; $i < strlen($data); $i = $i + 2) {
      $str .= substr($data, $i, 1);
    }
    return $str;
  }

  public static function startSession($reset)
  {
    session_start([ 
      'cookie_lifetime' => 3600,
      'cookie_secure' => true,
      'cookie_httponly' => true,
     ]);
    if ($reset) {
      session_regenerate_id(true);
      $_SESSION['user'] = "";
      $_SESSION['loggedin'] = false;
    }
    // utils::rg2log("Start session ". session_id() . " ". session_encode());
  }
}
