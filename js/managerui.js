/*global rg2:false */
(function () {
  var managerUI = {
    initialiseUI : function () {
      $("#rg2-animation-controls").hide();
      $("#rg2-create-tab").hide();
      $("#rg2-edit-tab").hide();
      $("#rg2-map-tab").hide();
      $("#rg2-manage-login").show();
      $("#rg2-draw-tab").hide();
      $("#rg2-results-tab").hide();
      $("#rg2-courses-tab").hide();
      $("#rg2-events-tab").hide();
      $("#rg2-info-panel").tabs("disable", rg2.config.TAB_EVENTS).tabs("option", "active", rg2.config.TAB_LOGIN);
    },

    setUIVisibility : function () {
      $('#rg2-draw-courses').hide();
      $("#rg2-manage-create").show();
      $("#rg2-create-tab").show();
      $("#rg2-edit-tab").show();
      $("#rg2-map-tab").show();
      $("#rg2-manage-login").hide();
      $("#rg2-login-tab").hide();
      $("#rg2-event-date-edit").datepicker({
        dateFormat : 'yy-mm-dd'
      });
      $('#rg2-event-comments').focus(function () {
        // Clear comment box if user focuses on it and it still contains default text
        var text = $("#rg2-event-comments").val();
        if (text === rg2.config.DEFAULT_EVENT_COMMENT) {
          $('#rg2-event-comments').val("");
        }
      });
    },

    displayCourseInfo : function (info) {
      this.displayInfoDialog(info, "Course");
    },

    displayResultInfo : function (info) {
      this.displayInfoDialog(info, "Result");
    },

    displayInfoDialog : function (info, option) {
      // option should be  "Result" or "Course"
      if (info) {
        $("#rg2-manage-" + option.toLowerCase() + "s").empty().html(info);
        $("#rg2-manage-" + option.toLowerCase() + "s").dialog({
          title : option + " details",
          dialogClass : "rg2-" + option.toLowerCase() + "-info-dialog",
          resizable : true,
          width : 'auto',
          maxHeight : (window.innerHeight * 0.9),
          buttons : {
            Ok : function () {
              $(this).dialog("close");
            }
          }
        });
      }
    },

    createMapDropdown : function (maps) {
      var dropdown, i;
      $("#rg2-map-selected").empty();
      dropdown = document.getElementById("rg2-map-selected");
      dropdown.options.add(rg2.utils.generateOption(rg2.config.INVALID_MAP_ID, 'Select map'));
      for (i = (maps.length - 1); i > -1; i -= 1) {
        dropdown.options.add(rg2.utils.generateOption(i, maps[i].mapid + ": " + maps[i].name));
      }
    },

    createGeorefDropdown : function (georef) {
      var dropdown;
      $("#rg2-georef-selected").empty();
      dropdown = document.getElementById("rg2-georef-selected");
      dropdown = georef.getDropdown(dropdown);
    },

    createEventEditDropdown : function () {
      var dropdown;
      $("#rg2-event-selected").empty();
      dropdown = document.getElementById("rg2-event-selected");
      dropdown = rg2.events.getEventEditDropdown(dropdown);
    },

    createRouteDeleteDropdown : function (id) {
      var dropdown, routes, i;
      $("#rg2-route-selected").empty();
      dropdown = document.getElementById("rg2-route-selected");
      routes = rg2.results.getRoutesForEvent(id);
      for (i = 0; i < routes.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(routes[i].resultid, routes[i].resultid + ": " + routes[i].name + " on " + routes[i].coursename));
      }
    },

    createEventLevelDropdown : function (id) {
      var dropdown, types, abbrev, i;
      $("#" + id).empty();
      dropdown = document.getElementById(id);
      types = ["Select level", "Training", "Local", "Regional", "National", "International"];
      abbrev = ["X", "T", "L", "R", "N", "I"];
      for (i = 0; i < types.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(abbrev[i], types[i]));
      }
    },

    setEvent : function (kartatid) {
      var event;
      if (kartatid) {
        // load details for this event
        event = rg2.events.getEventInfo(kartatid);
        rg2.loadEvent(event.id);
      } else {
        // no event selected so disable everything
        rg2.utils.setButtonState("disable", ["#btn-delete-event", "#btn-update-event", "#btn-delete-route"]);
        $("#rg2-event-name-edit").val("");
        $("#rg2-club-name-edit").val("");
        $("#rg2-event-date-edit").val("");
        $("#rg2-event-level-edit").val("");
        $("#rg2-edit-event-comments").val("");
        $("#rg2-route-selected").empty();
      }
    },

    eventFinishedLoading : function (event) {
      // called once the requested event has loaded
      // copy event details to edit-form
      // you tell me why this needs parseInt but the same call above doesn't
      $("#rg2-event-name-edit").empty().val(event.name);
      $("#rg2-club-name-edit").empty().val(event.club);
      $("#rg2-event-date-edit").empty().val(event.date);
      $("#rg2-event-level-edit").val(event.rawtype);
      $("#rg2-edit-event-comments").empty().val(event.comment);
      rg2.utils.setButtonState("enable", ["#btn-delete-event", "#btn-update-event", "#btn-delete-route"]);
      this.createRouteDeleteDropdown(event.id);
    },

    doCancelDeleteEvent : function () {
      $("#event-delete-dialog").dialog("destroy");
    },

    doCancelDeleteRoute : function () {
      $("#route-delete-dialog").dialog("destroy");
    },

    doCancelUpdateEvent : function () {
      $("#event-update-dialog").dialog("destroy");
    },

    doCancelCreateEvent : function () {
      $("#event-create-dialog").dialog("destroy");
    },

    doCancelAddMap : function () {
      $("#add-map-dialog").dialog("destroy");
    }
  };
  rg2.managerUI = managerUI;
}());