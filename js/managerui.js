
(function () {
  var managerUI = {
    showItems : function (items, doShow) {
      var i;
      for (i = 0; i < items.length; i += 1) {
        if (doShow) {
          $(items[i]).show();
        } else {
          $(items[i]).hide();
        }
      }
    },

    initialiseUI : function () {
      var items;
      items = ["#rg2-animation-controls", "#rg2-create-tab", "#rg2-edit-tab", "#rg2-map-tab", "#rg2-draw-tab", "#rg2-results-tab", "#rg2-courses-tab", "#rg2-events-tab"];
      this.showItems(items, false);
      $("#rg2-manage-login").show();
      $("#rg2-info-panel").tabs("disable", rg2.config.TAB_EVENTS).tabs("option", "active", rg2.config.TAB_LOGIN);
    },

    setUIVisibility : function () {
      var items;
      items = ["#rg2-draw-courses", "#rg2-manage-login", "#rg2-login-tab", "#rg2-enrich-course-names"];
      this.showItems(items, false);
      items = ["#rg2-manage-create", "#rg2-create-tab", "#rg2-edit-tab", "#rg2-map-tab"];
      this.showItems(items, true);
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
        dropdown.options.add(rg2.utils.generateOption(i, maps[i].mapid + ": " + rg2.he.decode(maps[i].name)));
      }
    },

    createGeorefDropdown : function (georef) {
      $("#rg2-georef-selected").empty();
      let dropdown = document.getElementById("rg2-georef-selected");
      georef.getDropdown(dropdown);
    },

    createEventEditDropdown : function () {
      $("#rg2-event-selected").empty();
      let dropdown = document.getElementById("rg2-event-selected");
      rg2.events.getEventEditDropdown(dropdown);
    },

    createRouteDeleteDropdown : function (id) {
      var dropdown, routes, i;
      $("#rg2-route-selected").empty();
      dropdown = document.getElementById("rg2-route-selected");
      routes = rg2.results.getRoutesForEvent(id);
      for (i = 0; i < routes.length; i += 1) {
        dropdown.options.add(rg2.utils.generateOption(routes[i].resultid, routes[i].resultid + ": " + rg2.he.decode(routes[i].name) + " on " + rg2.he.decode(routes[i].coursename)));
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
        $("#chk-edit-read-only").prop("checked", false);
      }
    },

    eventFinishedLoading : function (event) {
      // called once the requested event has loaded
      $("#rg2-event-name-edit").empty().val(rg2.he.decode(event.name));
      $("#rg2-club-name-edit").empty().val(rg2.he.decode(event.club));
      $("#rg2-event-date-edit").empty().val(event.date);
      $("#rg2-event-level-edit").val(event.rawtype);
      $("#rg2-edit-event-comments").empty().val(rg2.he.decode(event.comment));
      $("#chk-edit-read-only").prop("checked", event.locked);
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
