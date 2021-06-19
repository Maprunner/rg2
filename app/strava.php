<?php

class strava
{

	public static function getStravaActivities($code)
	{
		//request token
		$token = strava::getToken($code);
		//decode and get access token		
		$t = json_decode($token);
		$access_token = $t->access_token;
	
	  // just echo the token, don't get activities
	  //echo "{\"access_token\":" .$access_token. "}";
	
		//get latest strava activities	
	  $activities = strava::getActivities($access_token);
	
	  echo $activities;
	
	}

    public static function getToken($code)
    {
		$url = 'https://www.strava.com/api/v3/oauth/token';
		$data = array('client_id' => STRAVA_CLIENT, 'client_secret' => STRAVA_SECRET,
					   'code' => $code, 'grant_type' => 'authorization_code');

		// use key 'http' even if you send the request to https://...
		$options = array(
			'http' => array(
				'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
				'method'  => 'POST',
				'content' => http_build_query($data)
			)
		);
		$context  = stream_context_create($options);
		$result = file_get_contents($url, false, $context);
		if ($result === FALSE) { /* Handle error */ }
		return $result;
    }
	
	public static function getActivities($token)
    {
		$url = 'https://www.strava.com/api/v3/athlete/activities';

		// use key 'http' even if you send the request to https://...
		$options = array(
			'http' => array(
				'header'  => "Authorization: Bearer " . $token,
				'method'  => 'GET'
			)
		);
		$context  = stream_context_create($options);
		$activities = file_get_contents($url, false, $context);
		if ($activities === FALSE) { /* Handle error */ };
	
		$result = "{\"access_token\":\"" .$token. "\", \"activities\":" .$activities."}";

		return $result;
    }

	public static function getActivityStream($data){

		list($activity, $token) = explode('|', $data);

		$url = 'https://www.strava.com/api/v3/activities/'. $activity . '/streams?keys=latlng,time';

		// use key 'http' even if you send the request to https://...
		$options = array(
			'http' => array(
				'header'  => "Authorization: Bearer " . $token,
				'method'  => 'GET'
			)
		);
		$context  = stream_context_create($options);
		$stream = file_get_contents($url, false, $context);
		if ($stream === FALSE) { /* Handle error */ };

		return $stream;
	}

}