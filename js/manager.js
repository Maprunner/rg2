function User() {
	this.name = null;
	this.pwd = null;
}

function Manager() {
	this.loggedIn = false;
	this.user = new User();
	var that = this;
	$("#rg2-manager-login").submit(function(event) {
		that.user.name = $("#rg2-user-name").val();
		that.user.pwd = $("#rg2-password").val();
		// check we have user name and password
		if ((that.user.name) && (that.user.pwd)) {
			that.logIn();
		} else {
			var msg = "<div>Please enter user name and password.</div>";
			$(msg).dialog({
				title : "Login failed"
			});
			// prevent form submission
			return false;
		}
	});

	$("#rg2-manager-form").submit(function(event) {
		manager.user.name = $("#rg2-user-name").val();
		manager.user.pwd = $("#rg2-password").val();
		// check we have user name and password
		if ((manager.user.name) && (manager.user.pwd)) {
			manager.logIn();
		} else {
			var msg = "<div>Please enter user name and password.</div>";
			$(msg).dialog({
				title : "Login failed"
			});
			// prevent form submission
			return false;
		}
	});
}

Manager.prototype = {

	Constructor : Manager,

	logIn : function() {
		var url = json_url + '?type=login';
		var json = JSON.stringify(this.user);
		var that = this;
		$.ajax({
			type : 'POST',
			dataType : 'json',
			data : json,
			url : url,
			cache : false,
			success : function(data, textStatus, jqXHR) {
				that.enableEventEdit();
			},
			error : function(jqXHR, textStatus, errorThrown) {
				console.log(errorThrown);
				var msg = "<div>User name or password incorrect. Please try again.</div>";
				$(msg).dialog({
					title : "Login failed"
				});
			}
		});
		return false;
	},

	enableEventEdit : function() {
		$("#btn-add-event").button().click(function() {
			jQuery("#rg2-add-new-event").dialog({
				title : "Add new event",
				width : 'auto',
				buttons : {
					Add : function() {
						jQuery(this).dialog('close');
					},
					Cancel : function() {
						jQuery(this).dialog('close');
					}
				}
			});
		});

		$("#btn-edit-event").button().click(function() {
			var id = $("#rg2-manager-event-select").val();
		});

		$("#btn-delete-event").button().click(function() {
			var id = $("#rg2-manager-event-select").val();
		});

		$("#rg2-manager-options").show();
		$("#rg2-manager-login").hide();
	}
};

function ResultsFile() {
	this.loaded = false;
}

ResultsFile.prototype = {
	Constructor : ResultsFile,

	readResultsFile : function(evt) {

		var reader = new FileReader();

		reader.onerror = function(evt) {
			switch(evt.target.error.code) {
				case evt.target.error.NOT_FOUND_ERR:
					alert('File not found');
					break;
				case evt.target.error.NOT_READABLE_ERR:
					alert('File not readable');
					break;
				default:
					alert('An error occurred reading the file.');
			}
		};

		reader.onload = function(evt) {
			resultsfile.processResultsFile();
		};

		// read the selected file
		reader.readAsText(evt.target.files[0]);

	},

	processResultsFile : function() {
		console.log("split CSV here");
	}
}; 