/*global $:false */
var rg2 = ( function() {'use strict';
		var canvas = $("#rg2-map-canvas")[0];
		var ctx = canvas.getContext('2d');
		var map;
		var mapLoadingText;
		var events;
		var courses;
		var results;
		var controls;
		var animation;
		var manager;
		var drawing;
		var timer = 0;
		var infoPanelMaximised;
		var infoHideIconSrc;
		var infoShowIconSrc;
		var scaleFactor;
		var lastX;
		var lastY;
		var dragStart;
		var dragged;
		var requestedHash;
		var requestedEventID;

		var config = {
			DEFAULT_SCALE_FACTOR : 1.1,
			TAB_EVENTS : 0,
			TAB_COURSES : 1,
			TAB_RESULTS : 2,
			TAB_DRAW : 3,
			DEFAULT_NEW_COMMENT : "Type your comment",
			DEFAULT_EVENT_COMMENT : "Comments",
			// added to resultid when saving a GPS track
			GPS_RESULT_OFFSET : 50000,
			MASS_START_REPLAY : 1,
			REAL_TIME_REPLAY : 2,
			// dropdown selection value
			MASS_START_BY_CONTROL : 99999,
			VERY_HIGH_TIME_IN_SECS : 99999,
			// screen sizes for different layouts
			BIG_SCREEN_BREAK_POINT : 800,
			SMALL_SCREEN_BREAK_POINT : 500,
			PURPLE : '#b300ff',
			CONTROL_CIRCLE_RADIUS : 20,
			FINISH_INNER_RADIUS : 16.4,
			FINISH_OUTER_RADIUS : 23.4,
			RUNNER_DOT_RADIUS : 6,
			START_TRIANGLE_LENGTH : 30,
			OVERPRINT_LINE_THICKNESS : 2,
			REPLAY_LINE_THICKNESS : 3,
			START_TRIANGLE_HEIGHT : 40,
			// parameters for call to draw courses
			DIM : 0.5,
			FULL_INTENSITY : 1.0,
			SCORE_EVENT : 3
		};

		function init() {
			// check if a specific event has been requested
      requestedHash = window.location.hash;
			if (requestedHash) {
				requestedEventID = requestedHash.replace("#", "");
			}

			$("#btn-save-route").button().button("disable");
			$("#btn-save-gps-route").button().button("disable");
			$("#btn-reset-drawing").button().button("disable");
			$("#btn-undo").button().button("disable");
			$("#rg2-load-gps-file").button().button("disable");
			$("#btn-three-seconds").button().button("disable");

			// disable tabs until we have loaded something
			$("#rg2-info-panel").tabs({
				disabled : [config.TAB_COURSES, config.TAB_RESULTS, config.TAB_DRAW]
			});

			$("#rg2-result-list").accordion({
				collapsible : true,
				heightStyle : "content",
				select : function(event, ui) {
					console.log("Result index selected: " + ui.item[0].id);
				}
			});

			$("#rg2-clock").text("00:00:00");
			$("#rg2-clock-slider").slider({
				slide : function(event, ui) {
					// passes slider value as new time
					animation.clockSliderMoved(ui.value);
				}
			});

			$("#btn-mass-start").addClass('active');
			$("#btn-real-time").removeClass('active');

			$("#rg2-info-panel").tabs({
				active : config.TAB_EVENTS,
				heightStyle : "content",
				activate : function(event, ui) {
					tabActivated();
				}
			});

			map = new Image();
			mapLoadingText = "Select an event";
			events = new Events();
			courses = new Courses();
			results = new Results();
			controls = new Controls();
			animation = new Animation();
			manager = new Manager();
			drawing = new Draw();
			dragStart = null;
			// looks odd but this works for initialisation
			dragged = true;
			infoPanelMaximised = true;

			// initially loaded file has a close icon
			infoHideIconSrc = $("#rg2-resize-info-icon").attr("src");
			infoShowIconSrc = infoHideIconSrc.replace("hide-info", "show-info");

			$("#rg2-header-container").css("color", header_text_colour);
			$("#rg2-header-container").css("background", header_colour);
			$("#rg2-about-dialog").hide();
			$("#rg2-splits-display").hide();
			$("#rg2-track-names").hide();
			$("#rg2-add-new-event").hide();

			$("#btn-about").click(function() {
				displayAboutDialog();
			});

			$("#rg2-resize-info").click(function() {
				resizeInfoDisplay();
			});

			$("#btn-mass-start").click(function(event) {
				animation.setReplayType(config.MASS_START_REPLAY);
			});

			$("#btn-real-time").click(function(event) {
				animation.setReplayType(config.REAL_TIME_REPLAY);
			});

			$("#rg2-control-select").prop('disabled', true).click(function(event) {
				animation.setStartControl($("#rg2-control-select").val());
			});

			$("#rg2-name-select").prop('disabled', true).click(function(event) {
				drawing.setName(parseInt($("#rg2-name-select").val(), 10));
			});

			$("#rg2-course-select").click(function(event) {
				drawing.setCourse(parseInt($("#rg2-course-select").val(), 10));
			});

			$('#rg2-new-comments').focus(function() {
				// Clear comment box if user focuses on it and it still contains default text
				var text = $("#rg2-new-comments").val();
				if (text === config.DEFAULT_NEW_COMMENT) {
					$('#rg2-new-comments').val("");
				}
			});

			$('#rg2-event-comments').focus(function() {
				// Clear comment box if user focuses on it and it still contains default text
				var text = $("#rg2-event-comments").val();
				if (text === config.DEFAULT_EVENT_COMMENT) {
					$('#rg2-event-comments').val("");
				}
			});

			$("#btn-save-route").button().click(function() {
				drawing.saveRoute();
			});

			$("#btn-save-gps-route").button().click(function() {
				drawing.saveGPSRoute();
			});

			$("#btn-move-all").click(function(evt) {
				drawing.toggleMoveAll(evt.target.checked);
			});
			$("#btn-move-all").prop('checked', false);

			$("#btn-undo").click(function() {
				drawing.undoLastPoint();
			});

			$("#btn-reset-drawing").click(function() {
				drawing.resetDrawing();
			});

			$("#btn-three-seconds").click(function() {
				drawing.waitThreeSeconds();
			});

			$("#rg2-load-gps-file").change(function(evt) {
				drawing.uploadGPS(evt);
			});

			$("#btn-zoom-in").click(function() {
				zoom(1);
			});

			$("#btn-reset").click(function() {
				resetMapState();
			});

			$("#btn-zoom-out").click(function() {
				zoom(-1);
			});

			$("#btn-start-stop").click(function() {
				animation.toggleAnimation();
			});

			$("#btn-faster").click(function() {
				animation.goFaster();
			});

			$("#btn-slower").click(function() {
				animation.goSlower();
			});

			$("#btn-toggle-names").click(function() {
				animation.toggleNameDisplay();
				redraw(false);
			}).hide();

			$("#btn-show-splits").click(function() {
				$("#rg2-splits-table").empty();
				$("#rg2-splits-table").append(animation.getSplitsTable());
				$("#rg2-splits-table").dialog({
					width : 'auto',
					buttons : {
						Ok : function() {
							$(this).dialog('close');
						}
					}
				});
			});
			// enable once we have courses loaded
			$("#btn-show-splits").hide();

			// enable once we have courses loaded
			$("#btn-toggle-controls").click(function() {
				controls.toggleControlDisplay();
				redraw(false);
			}).hide();

			// set default to 0 secs = no tails
			$("#spn-tail-length").spinner({
				max : 600,
				min : 0,
				spin : function(event, ui) {
					animation.setTailLength(ui.value);
				}
			}).val(0);

			$("#btn-full-tails").prop('checked', false);
			$("#btn-full-tails").click(function(event) {
				if (event.target.checked) {
					animation.setFullTails(true);
					$("#spn-tail-length").spinner("disable");
				} else {
					animation.setFullTails(false);
					$("#spn-tail-length").spinner("enable");

				}
			});

			if ($('#rg2-manage').length !== 0) {
				$("#rg2-manager-options").hide();
			}

			trackTransforms(ctx);
			resizeCanvas();

			window.addEventListener('resize', resizeCanvas, false);

			canvas.addEventListener('DOMMouseScroll', handleScroll, false);
			canvas.addEventListener('mousewheel', handleScroll, false);
			canvas.addEventListener('mousedown', function(evt) {
				lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
				lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
				dragStart = ctx.transformedPoint(lastX, lastY);
				dragged = false;
				//console.log ("Mousedown " + lastX + " " + lastY + " " + dragStart.x + " " + dragStart.y);
			}, false);

			canvas.addEventListener('mousemove', function(evt) {
				lastX = evt.offsetX || (evt.layerX - canvas.offsetLeft);
				lastY = evt.offsetY || (evt.layerY - canvas.offsetTop);
				if (dragStart) {
					var pt = ctx.transformedPoint(lastX, lastY);
					//console.log ("Mousemove after" + pt.x + ": " + pt.y);
					// allow for Webkit which gives us mousemove events with no movement!
					if ((pt.x !== dragStart.x) || (pt.y !== dragStart.y)) {
						if (drawing.gpsFileLoaded()) {
							drawing.adjustTrack(parseInt(dragStart.x, 10), parseInt(dragStart.y, 10), parseInt(pt.x, 10), parseInt(pt.y, 10), evt.shiftKey, evt.ctrlKey);
						} else {
							ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
						}
						dragged = true;
						redraw(false);
					}
				}
			}, false);

			canvas.addEventListener('mouseup', function(evt) {
				//console.log ("Mouseup" + dragStart.x + ": " + dragStart.y);
				if (!dragged) {
					drawing.mouseUp(parseInt(dragStart.x, 10), parseInt(dragStart.y, 10));
				} else {
					drawing.dragEnded();
				}
				dragStart = null;
				redraw(false);
			}, false);

			// force redraw once map has loaded
			map.addEventListener("load", function() {
				resetMapState();
			}, false);

			// load event details
			$.getJSON(json_url, {
				type : "events",
				cache : false
			}).done(function(json) {
				console.log("Events: " + json.data.length);
				$.each(json.data, function() {
					events.addEvent(new Event(this));
				});
				createEventMenu();
				events.createEventDropdown();
			}).fail(function(jqxhr, textStatus, error) {
				var err = textStatus + ", " + error;
				console.log("Events request failed: " + err);
			});

		}

		function resetMapState() {
			// place map in centre of canvas and scale it down to fit
			var heightscale = canvas.height / map.height;
			lastX = canvas.width / 2;
			lastY = canvas.height / 2;
			dragStart = null;
			// looks odd but this works for initialisation
			dragged = true;
			var mapscale;
			// don't stretch map: just shrink to fit
			if (heightscale < 1) {
				mapscale = heightscale;
			} else {
				mapscale = 1;
			}
			// move map into view on small screens
			// avoid annoying jumps on larger screens
			if ((infoPanelMaximised) || (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT)) {
				ctx.setTransform(mapscale, 0, 0, mapscale, $("#rg2-info-panel").outerWidth(), 0);
			} else {
				ctx.setTransform(mapscale, 0, 0, mapscale, 0, 0);
			}
			ctx.save();
			redraw(false);
		}

		function resizeCanvas() {
			scaleFactor = config.DEFAULT_SCALE_FACTOR;
			var winwidth = window.innerWidth;
			var winheight = window.innerHeight;
			// allow for header
			$("#rg2-container").css("height", winheight - 36);
			canvas.width = winwidth;
			// allow for header
			canvas.height = winheight - 36;
			// set title bar
			if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
				$("#rg2-event-title").text(events.getActiveEventName() + " " + events.getActiveEventDate());
				$("#rg2-event-title").show();
			} else if (window.innerWidth > config.SMALL_SCREEN_BREAK_POINT) {
				$("#rg2-event-title").text(events.getActiveEventName());
				$("#rg2-event-title").show();
			} else {
				$("#rg2-event-title").hide();
			}
			resetMapState();
		}

		// called whenever the active tab changes to tidy up as necessary
		function tabActivated() {
			var active = $("#rg2-info-panel").tabs("option", "active");
			switch (active) {
				case config.TAB_DRAW:
					courses.removeAllFromDisplay();
					drawing.showCourseInProgress();
					break;
				default:
					break;
			}
			redraw(false);
		}

		/* called whenever anything changes enough to need screen redraw
		 * @param fromTimer {Boolean} true if called from timer: used to determine if animation time should be incremented
		 */
		function redraw(fromTimer) {
			// Clear the entire canvas
			// first save current transformed state
			ctx.save();
			// reset everything back to initial size/state/orientation
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			// clear the canvas
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			// go back to where we started
			ctx.restore();
			// set transparency of map to none
			ctx.globalAlpha = 1.0;

			if (map.height > 0) {
				// using non-zero map height to show we have a map loaded
				ctx.drawImage(map, 0, 0);
				var active = $("#rg2-info-panel").tabs("option", "active");
				if (active === config.TAB_DRAW) {
					courses.drawCourses(config.DIM);
					controls.drawControls();
					drawing.drawNewTrack();
				} else {
					courses.drawCourses(config.FULL_INTENSITY);
					results.drawTracks();
					controls.drawControls();
					// parameter determines if animation time is updated or not
					if (fromTimer) {
						animation.runAnimation(true);
					} else {
						animation.runAnimation(false);
					}
				}
			} else {
				ctx.font = '30pt Arial';
				ctx.textAlign = 'center';
				ctx.fillStyle = "black";
				ctx.fillText(mapLoadingText, canvas.width / 2, canvas.height / 2);
			}

		}

		function displayAboutDialog() {
			$("#rg2-about-dialog").dialog({
				//modal : true,
				minWidth : 400,
				buttons : {
					Ok : function() {
						$(this).dialog("close");
					}
				}
			});
		}

		function resizeInfoDisplay() {
			if (infoPanelMaximised) {
				infoPanelMaximised = false;
				$("#rg2-resize-info-icon").attr("src", infoShowIconSrc);
				$("#rg2-resize-info").prop("title", "Show info panel");
				$("#rg2-info-panel").hide();
			} else {
				infoPanelMaximised = true;
				$("#rg2-resize-info-icon").attr("src", infoHideIconSrc);
				$("#rg2-resize-info").prop("title", "Hide info panel");
				$("#rg2-info-panel").show();
			}
			// move map around if necesssary
			resetMapState();
		}

		var zoom = function(zoomDirection) {
			var factor = Math.pow(scaleFactor, zoomDirection);

			var pt = ctx.transformedPoint(lastX, lastY);
			ctx.translate(pt.x, pt.y);
			ctx.scale(factor, factor);
			ctx.translate(-pt.x, -pt.y);
			ctx.save();
			redraw(false);
		};

		var handleScroll = function(evt) {
			var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
			if (delta) {
				zoom(delta);
			}
			return evt.preventDefault() && false;
		};

		function createEventMenu() {
			//loads menu from populated events array
			var html = events.formatEventsAsMenu();
			$("#rg2-event-list").append(html);

			$("#rg2-event-list").menu({
				select : function(event, ui) {
					loadEvent(ui.item[0].id);
				}
			});

			// load requested event if set
			if (requestedEventID) {
				loadEvent(requestedEventID);
			}
		}

		function loadEvent(eventid) {
			// new event selected: show we are waiting
			$('body').css('cursor', 'wait');
			courses.deleteAllCourses();
			controls.deleteAllControls();
			animation.resetAnimation();
			drawing.initialiseDrawing();
			results.deleteAllResults();
			mapLoadingText = "Map loading...";
			map.src = null;
			redraw(false);
			events.setActiveEventID(eventid);
			// load chosen map: map gets redrawn automatically on load so that's it for here
			map.src = maps_url + "/" + events.getActiveMapID() + '.jpg';

			// set title bar
			if (window.innerWidth >= config.BIG_SCREEN_BREAK_POINT) {
				$("#rg2-event-title").text(events.getActiveEventName() + " " + events.getActiveEventDate());
				$("#rg2-event-title").show();
			} else if (window.innerWidth > config.SMALL_SCREEN_BREAK_POINT) {
				$("#rg2-event-title").text(events.getActiveEventName());
				$("#rg2-event-title").show();
			} else {
				$("#rg2-event-title").hide();
			}
			// get courses for event
			$.getJSON(json_url, {
				id : events.getKartatEventID(),
				type : "courses",
				cache : false
			}).done(function(json) {
				console.log("Courses: " + json.data.length);
				$.each(json.data, function() {
					courses.addCourse(new Course(this, events.isScoreEvent()));
				});
				courses.updateCourseDropdown();
				courses.generateControlList(controls);
				$("#btn-toggle-controls").show();
				$("#btn-toggle-names").show();
				getResults();
			}).fail(function(jqxhr, textStatus, error) {
				$('body').css('cursor', 'auto');
				var err = textStatus + ", " + error;
				console.log("Courses request failed: " + err);
			});

			var draw = new Draw();
		}

		function getResults() {
			$.getJSON(json_url, {
				id : events.getKartatEventID(),
				type : "results",
				cache : false
			}).done(function(json) {
				console.log("Results: " + json.data.length);
				var isScoreEvent = events.isScoreEvent();
				results.addResults(json.data, isScoreEvent);
				$("#rg2-result-list").accordion("refresh");
				getGPSTracks();
			}).fail(function(jqxhr, textStatus, error) {
				$('body').css('cursor', 'auto');
				var err = textStatus + ", " + error;
				console.log("Results request failed: " + err);
			});
		}

		function getGPSTracks() {
			$.getJSON(json_url, {
				id : events.getKartatEventID(),
				type : "tracks",
				cache : false
			}).done(function(json) {
				console.log("Tracks: " + json.data.length);
				results.addTracks(json.data);
				createCourseMenu();
				createResultMenu();
				animation.updateAnimationDetails();
				$('body').css('cursor', 'auto');
				$("#rg2-info-panel").tabs("enable", config.TAB_COURSES);
				$("#rg2-info-panel").tabs("enable", config.TAB_RESULTS);
				$("#rg2-info-panel").tabs("enable", config.TAB_DRAW);
				// open courses tab for new event: else stay on draw tab
				var active = $("#rg2-info-panel").tabs("option", "active");
				// don't change tab if we have come from DRAW since it means
				// we have just relaoded following a save
				if (active !== config.TAB_DRAW) {
					$("#rg2-info-panel").tabs("option", "active", config.TAB_COURSES);
				}
				$("#rg2-info-panel").tabs("refresh");
				$("#btn-show-splits").show();
				redraw(false);
			}).fail(function(jqxhr, textStatus, error) {
				$('body').css('cursor', 'auto');
				var err = textStatus + ", " + error;
				console.log("Tracks request failed: " + err);
			});
		}

		function createCourseMenu() {
			//loads menu from populated courses array
			$("#rg2-course-table").empty();
			$("#rg2-course-table").append(courses.formatCoursesAsTable());

			// checkbox on course tab to show a course
			$(".courselist").click(function(event) {
				if (event.target.checked) {
					courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
				} else {
					courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
					// make sure the all checkbox is not checked
					$(".allcourses").prop('checked', false);
				}
				redraw(false);
			});
			// checkbox on course tab to show all courses
			$(".allcourses").click(function(event) {
				if (event.target.checked) {
					courses.putAllOnDisplay();
					// select all the individual checkboxes for each course
					$(".courselist").prop('checked', true);
				} else {
					courses.removeAllFromDisplay();
					$(".courselist").prop('checked', false);
				}
				redraw(false);
			});
			// checkbox on course tab to show tracks for one course
			$(".tracklist").click(function(event) {
				var courseid = event.target.id;
				if (event.target.checked) {
					results.putTracksOnDisplay(courseid);
				} else {
					results.removeTracksFromDisplay(courseid);
					// make sure the all checkbox is not checked
					$(".alltracks").prop('checked', false);
				}
				redraw(false);
			});
			// checkbox on course tab to show all tracks
			$(".alltracks").click(function(event) {
				if (event.target.checked) {
					results.putAllTracksOnDisplay();
					// select all the individual checkboxes for each course
					$(".tracklist").prop('checked', true);
				} else {
					results.removeAllTracksFromDisplay();
					// deselect all the individual checkboxes for each course
					$(".tracklist").prop('checked', false);
				}
				redraw(false);
			});
		}

		function createResultMenu() {
			//loads menu from populated result array
			var html = results.formatResultListAsAccordion();
			// checkbox on course tab to show a course
			$(".courselist").unbind('click').click(function(event) {
				if (event.target.checked) {
					courses.putOnDisplay(parseInt(event.currentTarget.id, 10));
				} else {
					courses.removeFromDisplay(parseInt(event.currentTarget.id, 10));
					// make sure the all checkbox is not checked
					$(".allcourses").prop('checked', false);
				}
				redraw();

			});
			$("#rg2-result-list").empty();
			$("#rg2-result-list").append(html);

			$("#rg2-result-list").accordion("refresh");

			$("#rg2-info-panel").tabs("refresh");

			// checkbox to show a course
			$(".showcourse").click(function(event) {
				//Prevent opening accordion when check box is clicked
				event.stopPropagation();
				if (event.target.checked) {
					courses.putOnDisplay(event.target.id);
				} else {
					courses.removeFromDisplay(event.target.id);
				}
				redraw(false);
			});
			// checkbox to show a result
			$(".showtrack").click(function(event) {
				if (event.target.checked) {
					results.putOneTrackOnDisplay(event.target.id);
				} else {
					results.removeOneTrackFromDisplay(event.target.id);
				}
				redraw(false);
			});
			// checkbox to animate a result
			$(".replay").click(function(event) {
				if (event.target.checked) {
					animation.addRunner(new Runner(event.target.id, animation.colours.getNextColour()));
				} else {
					animation.removeRunner(event.target.id);
				}

				redraw(false);
			});
			// disable control dropdown if we have no controls
			if (courses.getHighestControlNumber() === 0) {
				$("#rg2-control-select").prop('disabled', true);
			} else {
				$("#rg2-control-select").prop('disabled', false);
			}
		}

		// Allow functions on collections to be called.
		// Not a great fix and probably better to rewrite things to avoid
		// this as far as possible but works for now.
		function getCourseDetails(courseid) {
			return courses.getFullCourse(courseid);
		}

		function getCourseName(courseid) {
			return courses.getCourseName(courseid);
		}

		function getResultsByCourseID(courseid) {
			return results.getResultsByCourseID(courseid);
		}

		function getTotalResultsByCourseID() {
			return results.getTotalResultsByCourseID();
		}

		function drawStart(x, y, text, angle) {
			return controls.drawStart(x, y, text, angle);
		}

		function drawSingleControl(x, y, i) {
			return controls.drawSingleControl(x, y, i);
		}

		function drawFinish(x, y, text) {
			return controls.drawFinish(x, y, text);
		}

		function getFullResult(resultid) {
			return results.getFullResult(resultid);
		}

		function getHighestControlNumber() {
			return courses.getHighestControlNumber();
		}

		function getKartatEventID(courseid) {
			return events.getKartatEventID(courseid);
		}

		function incrementTracksCount(courseid) {
			return courses.incrementTracksCount(courseid);
		}

		function putOnDisplay(courseid) {
			courses.putOnDisplay(courseid);
		}

		function removeFromDisplay(courseid) {
			courses.removeFromDisplay(courseid);
		}

		function createNameDropdown(courseid) {
			results.createNameDropdown(courseid);
		}

		function getRunnerName(resultid) {
			return results.getRunnerName(resultid);
		}

		function resultIDExists(resultid) {
			return results.resultIDExists(resultid);
		}

		function getKartatResultID(resultid) {
			return results.getKartatResultID(resultid);
		}

		function getTimeForID(resultid) {
			return results.getTimeForID(resultid);
		}

		function getSplitsForID(resultid) {
			return results.getSplitsForID(resultid);
		}

		function mapIsGeoreferenced() {
			return events.mapIsGeoreferenced();
		}

		function getWorldFile() {
			return events.getWorldFile();
		}

		function getControlX() {
			return drawing.getControlX();
		}

		function getControlY() {
			return drawing.getControlY();
		}

		function getActiveEventID() {
			return events.getActiveEventID();
		}

		return {
			// functions and variables available elsewhere
			init : init,
			config : config,
			redraw : redraw,
			ctx : ctx,
			loadEvent : loadEvent,
			mapIsGeoreferenced : mapIsGeoreferenced,
			getWorldFile : getWorldFile,
			getFullResult : getFullResult,
			drawStart : drawStart,
			drawSingleControl : drawSingleControl,
			drawFinish : drawFinish,
			getTimeForID : getTimeForID,
			getSplitsForID : getSplitsForID,
			resultIDExists : resultIDExists,
			getRunnerName : getRunnerName,
			putOnDisplay : putOnDisplay,
			removeFromDisplay : removeFromDisplay,
			createNameDropdown : createNameDropdown,
			incrementTracksCount : incrementTracksCount,
			getKartatEventID : getKartatEventID,
			getKartatResultID : getKartatResultID,
			getActiveEventID : getActiveEventID,
			getHighestControlNumber : getHighestControlNumber,
			getCourseDetails : getCourseDetails,
			getCourseName : getCourseName,
			getResultsByCourseID : getResultsByCourseID,
			getTotalResultsByCourseID : getTotalResultsByCourseID,
			getControlX : getControlX,
			getControlY : getControlY
		};

	}());

$(document).ready(rg2.init);
