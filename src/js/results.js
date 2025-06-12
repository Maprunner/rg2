import { resultIsBeingAnimated, updateTrackNames } from "./animation"
import { getMapSize } from "./canvas"
import { config, options } from "./config"
import {
  controls,
  isValidCourseId,
  getCourseDetails,
  getCourseName,
  getCoursesForEvent,
  getNumberOfControlsOnCourse,
  getnumberOfCourses,
  getFilterDetails,
  setResultsCount,
  updateScoreCourse
} from "./courses"
import { setName } from "./draw"
import { getActiveMapID, getEventInfoForKartatID, getKartatEventID, getWorldFile, isScoreEvent } from "./events"
import { Result } from "./result"
import { setResultCheckboxes, displayStatsDialog } from "./rg2ui"
import { t } from "./translate"
import { formatSecsAsMMSS, generateOption } from "./utils"

let results = []

export function addResults(data, isScoreEvent) {
  results.length = 0
  let codes = []
  let scorex = []
  let scorey = []
  // extract score course details if necessary
  if (isScoreEvent) {
    // details are only sent the first time a variant occurs (to reduce file size quite a lot in some cases)
    // so need to extract them for use later
    for (let i = 0; i < data.length; i += 1) {
      let variant = data[i].variant
      if (codes[variant] === undefined) {
        codes[variant] = data[i].scorecodes
        scorex[variant] = data[i].scorex
        scorey[variant] = data[i].scorey
      }
    }
  }
  // save each result
  for (let i = 0; i < data.length; i += 1) {
    // trap cases where only some courses for an event are set up, but for some reason all the results get saved
    // so you end up getting results for courses you don't know about: just ignore these results
    if (isValidCourseId(data[i].courseid)) {
      if (data[i].resultid > config.GPS_RESULT_OFFSET && data[i].coursename === "") {
        data[i].coursename = getCourseDetails(data[i].courseid).name
      }
      let result = undefined
      if (isScoreEvent) {
        let variant = data[i].variant
        result = new Result(data[i], isScoreEvent, codes[variant], scorex[variant], scorey[variant])
      } else {
        result = new Result(data[i], isScoreEvent)
      }
      results.push(result)
    }
  }
  //setTrackColours()
  setDisplayOrder()
  setDeletionInfo()
  setScoreCourseInfo()
  handleExclusions()
  sanitiseSplits(isScoreEvent)
}

export function addTracks(tracks) {
  for (let i = 0; i < tracks.length; i += 1) {
    let resultIndex = tracks[i].id
    let j = 0
    // loop through all results and add it against the correct id
    while (j < results.length) {
      if (resultIndex === results[j].resultid) {
        results[j].addTrack(tracks[i])
        break
      }
      j += 1
    }
  }
}

export function allResultsForCourseReplayed(courseid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      // careful: animation runners use index, not resultid
      if (!resultIsBeingAnimated(i)) {
        return false
      }
    }
  }
  return true
}

export function allTracksDisplayed() {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].hasValidTrack) {
      if (!results[i].displayTrack) {
        return false
      }
    }
  }
  return true
}

export function allTracksForCourseDisplayed(courseid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      if (results[i].hasValidTrack) {
        if (!results[i].displayTrack) {
          return false
        }
      }
    }
  }
  return true
}

export function allTracksForCourseReplayed(courseid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      if (results[i].hasValidTrack) {
        // careful: animation runners use index, not resultid
        if (!resultIsBeingAnimated(i)) {
          return false
        }
      }
    }
  }
  return true
}

export function anyTracksForCourseDisplayed(courseid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      if (results[i].hasValidTrack) {
        if (results[i].displayTrack) {
          return true
        }
      }
    }
  }
  return false
}

export function countResultsByCourseID(courseid) {
  const info = getEventInfoForKartatID()
  let count = 0
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      // don't double-count GPS tracks, unless no initial results (#284)
      if (
        results[i].resultid < config.GPS_RESULT_OFFSET ||
        info.format === config.FORMAT_NO_RESULTS ||
        info.format === config.FORMAT_SCORE_EVENT_NO_RESULTS
      ) {
        count += 1
      }
    }
  }
  return count
}

export function createNameDropdown(courseid) {
  let dropdown = document.getElementById("rg2-select-name")
  dropdown.innerHTML = ""
  dropdown.options.add(generateOption(null, t("Select name", "")))
  // empty dropdown if course not yet selected
  if (courseid === undefined) {
    return
  }
  for (let i = 0; i < results.length; i += 1) {
    // only use original results, not GPS results
    if (results[i].courseid === courseid) {
      if (results[i].resultid < config.GPS_RESULT_OFFSET) {
        dropdown.options.add(generateOption(results[i].resultid, results[i].time + " " + results[i].name))
      }
    }
  }
  dropdown.addEventListener("change", (e) => {
    setName(parseInt(e.target.value, 10))
  })
  dropdown.removeAttribute("disabled")
}

export function createResultMenu() {
  //loads menu from populated result array
  let html = formatResultListAsAccordion()
  // #177 not pretty but gets round problems of double encoding
  html = html.replace(/&amp;/g, "&")
  const el = document.getElementById("rg2-result-table")
  el.innerHTML = html
  setResultsSearch()
  setDisplayedRunnerCounts()
  setResultCheckboxes()
  const rows = document.querySelectorAll(".resultrow")
  for (let row of rows) {
    row.addEventListener("dblclick", (e) => {
      // currentTarget is the <tr> element: target points to <td> within the <tr>
      const id = parseInt(e.currentTarget.dataset.id, 10)
      if (id) {
        displayStatsDialog(id)
      }
    })
    row.addEventListener("contextmenu", (e) => {
      // currentTarget is the <tr> element: target points to <td> within the <tr>
      const id = parseInt(e.currentTarget.dataset.id, 10)
      if (id) {
        displayStatsDialog(id)
      }
    })
  }
}

export function deleteResultsForEvent() {
  results.length = 0
}

export function displayScoreCourse(id, display) {
  results[id].displayScoreCourse = display
}

export function drawTracks() {
  for (let i = 0; i < results.length; i += 1) {
    let filter
    if (results[i].isScoreEvent) {
      filter = { from: 0, to: results[i].scorex.length }
    } else {
      filter = getFilterDetails(results[i].courseid)
    }
    results[i].drawTrack(filter)
    results[i].drawScoreCourse()
  }
}

export function formatResultListAsAccordion() {
  // header rows to create
  let headers = []
  // results tables to create
  let tables = []

  if (results.length === 0) {
    return `<p>${t("No results available")}</p>`
  }
  let html = ""
  let oldCourseID = 0
  let tracksForThisCourse = 0
  prepareResults()
  for (let i = 0; i < results.length; i += 1) {
    const res = results[i]
    if (!res.showResult) {
      // result marked not to display as it is being combined with GPS route
      continue
    }
    if (res.courseid !== oldCourseID) {
      // save previous course table if there was one
      if (headers.length > 0) {
        html += getBottomRows(tracksForThisCourse, oldCourseID) + "</table>"
        tables.push(html)
      }
      // found a new course so add header
      tracksForThisCourse = 0
      headers.push(getCourseHeader(res))
      // Start the table with an id that relates to the course name to help with the filtering function
      html = `<table class='resulttable' id='table-${res.courseid}'><thead><tr><th>#</th>`
      html += `<th>${t("Name")}</th><th>${t("Time")}</th>`
      html += `<th><i class='bi-pencil'></i></th><th><i class='bi-play-fill'></i></th></tr></thead><tbody class="table-group-divider">`
      oldCourseID = res.courseid
    }
    html += `<tr class="resultrow" data-id="${res.rawid}"><td>${res.position}</td>`
    // #310 filter default comments in local language just in case
    if (res.comments !== "" && res.comments !== t("Type your comment")) {
      // #304 make sure double quotes show up
      res.comments = res.comments.replace(/"/g, "&quot;")
      html += `<td title="${res.comments}"><u>${getNameHTML(res, i)}</u>`
    } else {
      html += `<td>${getNameHTML(res, i)}`
    }
    if (res.canDelete) {
      html += ` <i class='deleteroute bi-trash-fill' data-resultidx=${i}></i>`
    }
    html += `</td><td>${res.time}</td>`
    let showTrack = ""
    let showReplay = "showreplay"
    if (res.hasValidTrack) {
      tracksForThisCourse += 1
      showTrack = `<input class='showtrack' data-courseid='${oldCourseID}' data-id='${res.resultid}' type=checkbox name=result></input>`
      showReplay += " showtrackreplay"
    }
    html += `<td>${showTrack}</td>`
    html += `<td><input class="${showReplay}" data-courseid=${oldCourseID} data-id=${res.resultid} type=checkbox name=replay></input></td></tr>`
  }
  html += `</tbody>${getBottomRows(tracksForThisCourse, oldCourseID)}</table>`
  tables.push(html)

  html = `<div class="accordion" id="results-accordion">`
  for (let i = 0; i < tables.length; i += 1) {
    html += `<div class="accordion-item">`
    html += `<h2 class="accordion-header d-flex" id="header-${i}">`
    html += `<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${i}" aria-expanded="true" aria-controls="collapse-${i}">`
    html += `${headers[i].title}</button>${headers[i].check}</h2>`
    html += `<div id="collapse-${i}" class="accordion-collapse collapse" aria-labelledby="header-${i}" data-bs-parent="#rg2-result-tab-body">`
    html += `<div class="accordion-body px-0">${tables[i]}</div></div></div>`
  }
  html += `</div>`
  return html
}

function formatTotalRunningTime(secs) {
  let time = Math.floor(secs / 86400) + " days "
  secs = secs - 86400 * Math.floor(secs / 86400)
  time += Math.floor(secs / 3600) + " hours "
  secs = secs - 3600 * Math.floor(secs / 3600)
  time += Math.floor(secs / 60) + " minutes "
  time += secs - 60 * Math.floor(secs / 60) + " seconds"
  return time
}

// read through results to get list of all controls on score courses
// since there is no master list of controls!
export function generateScoreCourses() {
  let courses = []
  let codes = []
  let x = []
  let y = []
  for (let i = 0; i < results.length; i += 1) {
    const res = results[i]
    // only do this for original results, not GPS results
    if (res.resultid < config.GPS_RESULT_OFFSET) {
      const courseid = res.courseid
      // save courseid if it is new
      if (courses.indexOf(courseid) === -1) {
        courses.push(courseid)
        codes[courseid] = []
        x[courseid] = []
        y[courseid] = []
      }
      // read all controls for this result and save if new
      for (let j = 0; j < res.scorecodes.length; j += 1) {
        if (codes[courseid].indexOf(res.scorecodes[j]) === -1) {
          codes[courseid].push(res.scorecodes[j])
          x[courseid].push(res.scorex[j])
          y[courseid].push(res.scorey[j])
        }
      }
    }
  }
  // save the details we have just generated
  for (let i = 0; i < courses.length; i += 1) {
    const courseid = courses[i]
    updateScoreCourse(courseid, codes[courseid], x[courseid], y[courseid])
  }
}

export function getAllResultsForCourse(courseid) {
  let list = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      // only want first entry: not other drawn routes
      if (results[i].resultid === results[i].rawid) {
        list.push(results[i])
      }
    }
  }
  return list
}

export function getAllResultsForVariant(variant) {
  let list = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].variant === variant) {
      // only want first entry: not other drawn routes
      if (results[i].resultid === results[i].rawid) {
        list.push(results[i])
      }
    }
  }
  return list
}

export function getAllRunnersForCourse(courseid) {
  let runners = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      runners.push(results[i].resultid)
    }
  }
  return runners
}

export function getAllRunnersWithTrackForCourse(courseid) {
  let runners = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid) {
      if (results[i].hasValidTrack) {
        runners.push(results[i].resultid)
      }
    }
  }
  return runners
}

function getBottomRows(tracks, courseid) {
  // create bottom rows for all tracks checkboxes
  // first row is drawn and GPS routes (if they exist)
  let html = `<tfoot class="table-group-divider"><tr class='allitemsrow'><td></td><td>${t("Routes")}</td><td></td>`
  if (tracks > 0) {
    html += `<td><input class='allcoursetracks' data-courseid=${courseid} type=checkbox name=track></input></td>`
    html += `<td><input class='allcoursetracksreplay' data-courseid=${courseid} type=checkbox name=replay></input></td>`
  } else {
    html += "<td></td><td></td>"
  }
  // second row allows replay of non-drawn routes
  html += `</tr><tr class='allitemsrow'><td></td><td>${t("All")}</td><td></td><td></td>`
  html += `<td><input class='allcoursereplay' data-courseid=${courseid} type=checkbox name=replay></input></td></tr></tfoot>`
  return html
}

export function getCommentsForEvent() {
  let hasComments = false
  let html = [
    `<table id='rg2-comments-table' class='table table-sm table-striped table-bordered'>`,
    `<thead><tr><th>${t("Name")}</th><th>${t("Course")}</th>`,
    `<th>${t("Comments")}</th></tr></thead><tbody class="table-group-divider">`
  ].join("")
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].comments !== "") {
      hasComments = true
      html += [
        `<tr><td>${results[i].name}</td><td>${results[i].coursename}</td>`,
        `<td>${results[i].comments}</td></tr>`
      ].join("")
    }
  }
  if (hasComments) {
    html += `</tbody></table>`
  } else {
    html = ""
  }
  return html
}

export function getCourseForResult(id) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid === id) {
      return results[i].courseid
    }
  }
  return undefined
}

function getCourseHeader(result) {
  let text = result.coursename
  const info = getCourseDetails(result.courseid)
  // need to protect against some old events with dodgy results
  if (info) {
    text += info.lengthValid ? ": " + info.length + " km" : ""
  }
  let html = `<div class="d-flex w-100"><div class="flex-grow-1 runners-table-course-header" data-runners="" data-courseid="${result.courseid}">${text}</div>`
  let check = `<div class="px-2"><input class='showcourse' data-courseid="${result.courseid}"`
  check += ` type=checkbox name ="course" title='Show course' ></input ></div >`
  return { title: html, check: check }
}

export function getDeletionInfo(id) {
  return { id: results[id].resultid, token: results[id].token }
}

export function getDisplayedTrackDetails() {
  // used to populate rg2-track-names within animation on screen redraw
  let tracks = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].displayTrack) {
      let info = {}
      info.trackColour = results[i].trackColour
      info.course = getCourseName(results[i].courseid)
      info.name = results[i].name
      info.resultid = results[i].resultid
      info.rawid = results[i].rawid
      tracks.push(info)
    }
  }
  return tracks
}

export function getFullResultforResultID(resultid) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid === resultid) {
      return results[i]
    }
  }
  return undefined
}

export function getFullResultForRawID(rawid) {
  let routeresult = undefined
  let result = results.find((res) => res.rawid === rawid)
  // only looks for first GPS route for now...
  if (result !== undefined) {
    routeresult = results.find((res) => res.resultid - rawid === config.GPS_RESULT_OFFSET)
    if (routeresult === undefined) {
      result.routeresultid = rawid
    } else {
      result.routeresultid = routeresult.resultid
      result.hasValidTrack = routeresult.hasValidTrack
    }
  }
  return result
}

function getNameHTML(res, i) {
  let namehtml
  if (res.rawid === res.resultid) {
    namehtml = res.name
  } else {
    namehtml = "<i>" + res.name + "</i>"
  }
  if (res.isScoreEvent) {
    namehtml = `<input class='showscorecourse' data-courseid=${i} type=checkbox></input> ${namehtml}`
  }
  return `<div>${namehtml}</div>`
}

function getRawDisplayOrder(rawid) {
  let idx = results.findIndex((res) => res.resultid === rawid)
  return idx > -1 ? results[idx].displayOrder : rawid
}

function getResultsInfo() {
  let info = { results: 0, drawnroutes: 0, gpsroutes: 0, secs: 0 }
  for (let i = 0; i < results.length; i += 1) {
    const res = results[i]
    if (res.resultid < config.GPS_RESULT_OFFSET) {
      info.results += 1
      // beware invalid splits for incomplete runs
      if (res.time) {
        info.secs += res.splits[res.splits.length - 1]
      }
    }
    if (res.hasValidTrack) {
      if (res.resultid < config.GPS_RESULT_OFFSET) {
        info.drawnroutes += 1
      } else {
        info.gpsroutes += 1
      }
    }
  }
  info.totalroutes = info.drawnroutes + info.gpsroutes
  if (info.results > 0) {
    info.percent = ((100 * info.totalroutes) / info.results).toFixed(1)
  } else {
    info.percent = 0
  }
  info.time = formatTotalRunningTime(info.secs)
  return info
}

export function getResultsStats(controls, validWorldFile) {
  const resultsinfo = getResultsInfo()
  const coursearray = getCoursesForEvent()
  const mapSize = getMapSize()
  let wf = ""
  if (validWorldFile) {
    const worldFile = getWorldFile()
    const digits = 1000000
    wf = `. ${t("Map is georeferenced")}: ${parseInt(worldFile.F * digits) / digits}`
    wf += `, ${parseInt(worldFile.C * digits) / digits}.`
  }

  let stats = [
    `<tr><td>${t("Courses")}</td><td>${coursearray.length}</td></tr>`,
    `<tr><td>${t("Controls")}</td><td>${controls}</td></tr>`,
    `<tr><td>${t("Results")}</td><td>${resultsinfo.results}</td></tr>`,
    `<tr><td>${t("Routes")}</td><td>${resultsinfo.totalroutes} (${resultsinfo.percent}%)</td></tr>`,
    `<tr><td>${t("Drawn routes")}</td><td>${resultsinfo.drawnroutes}</td></tr>`,
    `<tr><td>${t("GPS routes")}</td><td>${resultsinfo.gpsroutes}</td></tr>`,
    `<tr><td>${t("Total time")}</td><td>${resultsinfo.time}</td></tr>`,
    `<tr><td>${t("Map")} ID ${getActiveMapID()}</td><td>${mapSize.width}  x ${mapSize.height} pixels${wf}</td></tr>`
  ].join("")
  return stats
}

export function getRoutesForEvent() {
  let routes = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].hasValidTrack) {
      let route = {}
      route.id = i
      route.resultid = results[i].resultid
      route.name = results[i].name
      route.time = results[i].time
      route.coursename = results[i].coursename
      routes.push(route)
    }
  }
  return routes
}

export function getTimeAndSplitsForID(resultid) {
  for (let i = 0; i < results.length; i += 1) {
    if (resultid === results[i].resultid) {
      return { time: results[i].time, splits: results[i].splits }
    }
  }
  return { time: config.TIME_NOT_FOUND, splits: [] }
}

export function getTracksOnDisplay() {
  let tracks = []
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i]
    if (result.displayTrack) {
      tracks.push(result.resultid)
    }
  }
  return tracks
}

export function getVariantList() {
  // extract a list of all variants in a set of score/relay results
  const variants = []
  results.forEach((res) => {
    if (!variants.includes(res.variant) && res.variant !== undefined) {
      variants.push(res.variant)
    }
  })
  return variants
}

function handleExclusions() {
  // adjust times for events with excluded controls that have uploaded unadjusted splits
  let currentCourseID = undefined
  let course = undefined
  let adjustedCourseIDs = []
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid !== currentCourseID) {
      currentCourseID = results[i].courseid
      course = getCourseDetails(currentCourseID)
    }
    if (course.excludeType === config.EXCLUDED_REAL_SPLITS) {
      if (adjustedCourseIDs.indexOf(currentCourseID) === -1) {
        adjustedCourseIDs.push(currentCourseID)
      }
      let excluded = 0
      // start at 1 since you can't exclude the start control
      for (let j = 1; j < course.exclude.length; j += 1) {
        if (course.exclude[j]) {
          excluded = excluded + Math.min(results[i].splits[j] - results[i].splits[j - 1], course.allowed[j])
        }
      }
      results[i].timeInSecs = Math.max(results[i].splits[results[i].splits.length - 1] - excluded, 0)
      results[i].time = formatSecsAsMMSS(results[i].timeInSecs)
    }
  }
  // set positions for amended courses
  for (let i = 0; i < adjustedCourseIDs.length; i += 1) {
    let runners = results.filter((res) => res.courseid === adjustedCourseIDs[i])
    // horrid mess since all GPS results show status "ok" even if the original results was not "ok"
    // so need to copy across status from original result
    for (let j = 0; j < runners.length; j += 1) {
      if (runners[j].rawid !== runners[j].resultid) {
        let idx = runners.findIndex((res) => res.resultid === runners[j].rawid)
        // should always find the index but...
        if (idx > -1) {
          runners[j].status = runners[idx].status
        }
      }
    }
    runners.sort(function (a, b) {
      // sort valid times in ascending order
      if (a.status !== "ok" || a.timeInSecs === 0) {
        if (b.status !== "ok" || b.timeInSecs === 0) {
          return 0
        } else {
          return 1
        }
      }
      if (b.status !== "ok" || b.timeInSecs === 0) {
        return -1
      }
      return a.timeInSecs - b.timeInSecs
    })
    let pos = 0
    let prevTime = 0
    for (let j = 0; j < runners.length; j += 1) {
      if (runners[j].status !== "ok" || runners[j].timeInSecs === 0) {
        runners[j].position = ""
        continue
      }
      if (prevTime !== runners[j].timeInSecs) {
        pos = pos + 1
        prevTime = runners[j].timeInSecs
      } else {
        // same time, but might be GPS result for a normal result
        if (j > 0) {
          if (runners[j].rawid !== runners[j - 1].rawid) {
            pos = pos + 1
          }
        }
      }
      runners[j].position = pos
    }
    for (let j = 0; j < runners.length; j += 1) {
      let idx = results.findIndex((res) => res.resultid === runners[j].resultid)
      // should always find the index but...
      if (idx > -1) {
        results[idx].position = runners[j].position
        // set new display order for this course
        results[idx].displayOrder = j
      }
    }
  }
}

function prepareResults() {
  // want to avoid extra results line for GPS routes if there is no drawn route
  // first sort so that GPS routes come after initial result
  results.sort(sortByCourseIDThenResultID)
  // now we can combine first GPS route with original result if needed
  let oldID = undefined
  let canCombine = false
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].rawid === oldID) {
      if (canCombine) {
        if (results[i].hasValidTrack) {
          // found a GPS track to combine
          results[i - 1].showResult = false
          // add position to GPS route
          results[i].position = results[i - 1].position
          canCombine = false
        }
      }
    } else {
      // this is the original result which can be combined if
      // it doesn't already have a drawn route
      canCombine = !results[i].hasValidTrack
      oldID = results[i].rawid
    }
  }
}

export function resetSpeedColours() {
  // called when user changes GPS speed colour configuration
  for (let i = 0; i < results.length; i += 1) {
    // forces colours to recalculate
    results[i].speedColour.length = 0
  }
}

export function resultIDExists(resultid) {
  for (let i = 0; i < results.length; i += 1) {
    if (resultid === results[i].resultid) {
      return true
    }
  }
  return false
}

function sanitiseSplits(isScoreEvent) {
  // sort out missing punches and add some helpful new fields
  let currentCourseID = undefined
  let course = undefined
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid !== currentCourseID) {
      currentCourseID = results[i].courseid
      course = getCourseDetails(currentCourseID)
    }
    results[i].legSplits = []
    results[i].legSplits[0] = 0
    let previousValidSplit = 0
    let nextSplitInvalid = false
    for (let j = 1; j < results[i].splits.length; j += 1) {
      if (results[i].splits[j] - previousValidSplit === 0) {
        if (course.exclude[j]) {
          results[i].legSplits[j] = results[i].splits[j] - previousValidSplit
          previousValidSplit = results[i].splits[j]
        } else {
          // found a zero split
          results[i].legSplits[j] = 0
          // need to ignore next split as well: e.g missing 3 means splits to 3 and 4 are invalid
          nextSplitInvalid = true
          if (results[i].lastValidSplit === undefined) {
            // race positions need to stop at previous control
            results[i].lastValidSplit = j - 1
          }
        }
      } else {
        if (nextSplitInvalid) {
          results[i].legSplits[j] = 0
          previousValidSplit = results[i].splits[j]
          nextSplitInvalid = false
        } else {
          results[i].legSplits[j] = results[i].splits[j] - previousValidSplit
          previousValidSplit = results[i].splits[j]
        }
      }
    }
    if (results[i].lastValidSplit === undefined) {
      results[i].lastValidSplit = results[i].splits.length - 1
    }

    // handle corrupted events with missing splits
    // force all results to have the correct number of splits to make stats processing work correctly
    if (!isScoreEvent) {
      // splits array contains "S" and "F" as well as each control
      const expectedSplits = getNumberOfControlsOnCourse(results[i].courseid) + 2
      while (results[i].splits.length < expectedSplits) {
        // copy last valid split data as often as necessary to fill missing gaps
        results[i].splits.push(results[i].splits[results[i].splits.length - 1])
        results[i].legSplits.push(0)
      }
    }
  }
}

export function saveResults(results) {
  // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
  if (getnumberOfCourses() > 0) {
    addResults(results, isScoreEvent())
  }
  setResultsCount()
  if (isScoreEvent()) {
    generateScoreCourses()
    controls.generateControlList()
  }
}

export function saveRoutes(data) {
  // TODO remove temporary (?) fix to get round RG1 events with no courses defined: see #179
  if (getnumberOfCourses() > 0) {
    addTracks(data)
  }
}

function setDeletionInfo() {
  const eventid = getKartatEventID()
  let deletionInfo = []
  const opt = options.drawnRoutes
  // find routes that can be deleted for this event
  for (let i = 0; i < opt.length; i += 1) {
    if (opt[i].eventid === eventid) {
      deletionInfo.push(opt[i])
    }
  }
  for (let i = 0; i < deletionInfo.length; i += 1) {
    for (let r = 0; r < results.length; r += 1) {
      if (results[r].resultid === deletionInfo[i].id) {
        results[r].canDelete = true
        results[r].token = deletionInfo[i].token
      }
    }
  }
}

function setDisplayedRunnerCounts() {
  // set number of displayed runners in each course header
  const resultTable = document.getElementById("rg2-result-table")
  const courses = resultTable.querySelectorAll("#results-accordion .accordion-item")
  courses.forEach((course) => {
    const displayedRows = course.querySelectorAll(".resulttable tbody tr:not(.d-none)")
    course.querySelector(".runners-table-course-header").setAttribute("data-runners", displayedRows.length)
  })
}

function setDisplayOrder() {
  // used to sort results when generating results table for courses with excluded controls
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid < config.GPS_RESULT_OFFSET) {
      // order stays as it was when event was set up
      results[i].displayOrder = i
    } else {
      results[i].displayOrder = getRawDisplayOrder(results[i].rawid)
    }
  }
}

export function setResultColour(rawid, trackColour) {
  // colours set by rawid so that all tracks for same runner are same colour
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].rawid === rawid) {
      results[i].userColour = trackColour
      results[i].trackColour = trackColour
    }
  }
}

function setResultsSearch() {
  let searchBox = document.getElementById("rg2-result-search")
  if (results.length === 0) {
    searchBox.classList.add("d-none")
    return
  }
  searchBox.innerHTML = `<form class="d-flex pb-2" role="search">
  <input class="form-control mx-2" type="search" aria-label="${t("Search")}">
  <i class="bi-search mx-2"></i>
  </form>`
  let resultTable = document.getElementById("rg2-result-table")
  searchBox.addEventListener("keyup", (e) => {
    const filter = e.target.value.toUpperCase()
    const rows = resultTable.querySelectorAll("tbody tr")
    // set visibility of all runners based on filter
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].innerText.toUpperCase().indexOf(filter) > -1) {
        rows[i].classList.remove("d-none")
      } else {
        rows[i].classList.add("d-none")
      }
    }
    setDisplayedRunnerCounts()
  })
}

export function setScoreCourseDisplay(resultid, display) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid === resultid) {
      results[i].displayScoreCourse = display
    }
  }
}

function setScoreCourseInfo() {
  // don't get score course info for GPS tracks so find it from original result
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid >= config.GPS_RESULT_OFFSET) {
      const baseresult = getFullResultForRawID(results[i].rawid)
      if (baseresult !== undefined) {
        if (baseresult.scorex !== undefined) {
          results[i].scorex = baseresult.scorex
          results[i].scorey = baseresult.scorey
          results[i].scorecodes = baseresult.scorecodes
        }
      }
    }
  }
}

export function setTrackDisplayByCourse(courseid, display) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].courseid === courseid || config.DISPLAY_ALL_COURSES === courseid) {
      results[i].setTrackDisplay(display)
    }
  }
  updateTrackNames()
}

export function setTrackDisplayByResult(resultid, display) {
  for (let i = 0; i < results.length; i += 1) {
    if (results[i].resultid === parseInt(resultid, 10)) {
      results[i].setTrackDisplay(display)
    }
  }
  updateTrackNames()
}

function sortByCourseIDThenResultID(a, b) {
  // sorts GPS results to be immediately after the associated main id
  if (a.courseid > b.courseid) {
    return 1
  }
  if (b.courseid > a.courseid) {
    return -1
  }
  // if rawid matches then this is a GPS route for an existing result
  if (a.rawid === b.rawid) {
    return a.resultid - b.resultid
  }
  // we know these are different results
  // now sort by displayOrder to allow handling of excluded controls when results order might change
  // displayOrder defaults to the original results order if nothing is excluded so this works as needed
  // whether controls are excluded or not
  return a.displayOrder - b.displayOrder
}
