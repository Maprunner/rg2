/**
 * @author Simon Errington
 *
 * Routegadget 2.0 Viewer
 *
 * Released under the MIT license
 *
 */

  function Manager() {
    this.loggedIn = false;
    jQuery("#btn-login").button()
      .on ('click', this.logIn)
  }

  Manager.prototype = {
  	
	Constructor : Manager,
	
	logIn: function () {
    var $url = json_url + '?type=login';
    var user = jQuery("#rg2-user-name").val();
    var pwd = jQuery("#rg2-password").val();

    //var json = JSON.stringify(this.routeData);
    jQuery.ajax({
      type: 'POST',
      url: $url,
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Username", user);
        xhr.setRequestHeader("Password", pwd);
      },
      success: function(data, textStatus, jqXHR) {
      	if (data.ok) {
      		console.log(data.status_msg);
      	} else {
      		console.log(data.status_msg);
      	}
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
      }        
    })
	  return false;
	}
	
  }
