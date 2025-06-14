import { redraw } from "./canvas"
import { config } from "./config"
import { Controls } from "./controls"
import { Course } from "./course"
import { setDrawingCourse } from "./draw"
import { isScoreEvent } from "./events"
import { decode } from "html-entities"
import { anyTracksForCourseDisplayed, countResultsByCourseID } from "./results"
import { t } from "./translate"
import { generateOption } from "./utils"
import "toolcool-range-slider"

// indexed by the provided courseid which omits 0 and hence a sparse array
// careful when iterating or getting length!
let courses = []
export let controls = undefined
let totaltracks = 0
let numberOfCourses = 0
let highestControlNumber = 0

function addCourse(data) {
  courses[data.courseid] = new Course(data, isScoreEvent())
  numberOfCourses += 1
  // allow for courses with no defined controls
  // careful here: != catches null and undefined, but !== just catches undefined
  if (courses[data.courseid].codes !== undefined) {
    if (courses[data.courseid].codes.length > highestControlNumber) {
      // the codes includes Start and Finish: we don't need F so subtract 1 to get controls
      highestControlNumber = courses[data.courseid].codes.length - 1
    }
  }
}

export function allCoursesDisplayed() {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      if (!courses[i].display) {
        return false
      }
    }
  }
  return true
}

export function createCourseDropdown() {
  let dropdown = document.getElementById("rg2-select-course")
  dropdown.innerHTML = ""
  dropdown.options.add(generateOption(null, t("Select course", "")))
  for (let i = 0; i < courses.length; i = i + 1) {
    if (courses[i] !== undefined) {
      dropdown.options.add(generateOption(i, decode(courses[i].name)))
    }
  }
  dropdown.addEventListener("change", (e) => {
    setDrawingCourse(parseInt(e.target.value, 10))
  })
}

export function createCourseMenu() {
  const el = document.getElementById("rg2-course-table")
  el.innerHTML = formatCourses()
  const filterTable = document.getElementById("rg2-course-filter-table")
  filterTable.innerHTML = formatCourseFilters()
  const filters = document.querySelectorAll("[data-course-filter]")
  filters.forEach((filter) => {
    filter.addEventListener("change", filterChanged)
  })
}

export function deleteAllCourses() {
  courses.length = 0
  totaltracks = 0
  numberOfCourses = 0
  highestControlNumber = 0
}

export function drawCourses(intensity) {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      courses[i].drawCourse(intensity)
    }
  }
}

export function drawLinesBetweenControls(pt, angle, courseid, opt, filter) {
  courses[courseid].drawLinesBetweenControls(pt, angle, opt, filter)
}

function filterChanged(e) {
  const courseid = parseInt(e.target.dataset.courseFilter, 10)
  courses[courseid].filterFrom = e.detail.value1
  courses[courseid].filterTo = e.detail.value2
  redraw()
}

function formatCourseDetails() {
  let details = { html: "", res: 0, coursecount: 0 }
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      details.coursecount = details.coursecount + 1
      details.html += [
        `<tr><td>${courses[i].name}</td >`,
        `<td><input class='showcourse' data-courseid=${i} type='checkbox' name='course'></input></td>`,
        `<td class='text-center'>${courses[i].resultcount}</td><td class='text-center'>${courses[i].trackcount}</td><td>`
      ].join("")
      details.res += courses[i].resultcount
      if (courses[i].trackcount > 0) {
        details.html += `<input data-courseid=${courses[i].courseid} class='allcoursetracks' type=checkbox name=track></input></td>`
        details.html += `<td><input data-courseid=${courses[i].courseid} class='allcoursetracksreplay' type=checkbox name=replay></input>`
      } else {
        details.html += `</td><td>`
      }
      details.html += `</td></tr>`
    }
  }
  return details
}

function formatCourseFilters() {
  let html = ""
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      // only filter for normal events with at least one control as well as start and finish
      if (!courses[i].isScoreCourse && courses[i].codes.length > 2) {
        html += [
          `<div id='course-filter-${courses[i].courseid}' data-display="false" data-course="${courses[i].courseid}" class="row">`,
          `<div class="col-3">${courses[i].name}</div>`,
          `<div class="col-9 pt-2">`,
          `  <tc-range-slider step="1" min="0" max="${courses[i].codes.length}" value1="0"`,
          `value2="${courses[i].codes.length}" round="0" data-course-filter="${courses[i].courseid}>"`,
          `</tc-range-slider></div></div>`
        ].join("")
      }
    }
  }
  return html
}

function formatCourses() {
  let html = [
    `<table class='table table-striped table-hover table-sm'><thead>`,
    `<tr><th>${t("Course")}</th><th><i class='bi-eye-fill'></i></th><th>${t("Runners")}</th>`,
    `<th>${t("Routes")}</th><th><i class='bi-pencil'></i></th><th><i class='bi-play-fill'></i></th></tr>`,
    `</thead><tbody class="table-group-divider">`
  ].join("")
  const details = formatCourseDetails()
  // add bottom row for all courses checkboxes
  html +=
    details.html +
    `</tbody><tfoot class="table-group-divider"><tr class='allitemsrow'><td>${t("All")}</td>
    <td><input class='showallcourses' data-id="all" type=checkbox name=course></input></td>
    <td class='text-center'>${details.res}</td><td class='text-center'>${totaltracks}</td><td>`

  if (totaltracks > 0) {
    html += `<input data-id="all" class='alltracks' type=checkbox name=track></input>`
  }
  html += "</td><td></td></tr></tfoot></table>"
  return html
}

export function getCourses() {
  return courses
}

export function getCourseDetails(courseid) {
  return courses[courseid]
}

export function getCourseDetailsByName(coursename) {
  // courses is a sparse array so need to handle empty entries
  return courses.find((course) => (course ? course.name === coursename : false))
}

export function getCourseName(courseid) {
  return courses[courseid].name
}

export function getCoursesForEvent() {
  let list = []
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      let course = {}
      course.id = courses[i].courseid
      course.name = courses[i].name
      course.results = courses[i].resultcount
      list.push(course)
    }
  }
  return list
}

export function getCoursesOnDisplay() {
  let displayed = []
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      if (courses[i].display) {
        displayed.push(i)
      }
    }
  }
  return displayed
}

export function getExcludedText() {
  // recreates excluded_* text file contents
  // courseid|type|control,time|...
  let text = ""
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      if (courses[i].excludeType !== config.EXCLUDED_NONE) {
        text = text + courses[i].courseid + "|" + courses[i].excludeType
        text =
          text +
          courses[i].exclude.reduce((accum, exclude, index) => {
            return exclude ? accum + "|" + index + "," + courses[i].allowed[index] : accum
          }, "")
        text = text + "\n"
      }
    }
  }
  return text
}

export function getFilterDetails(courseid) {
  let filter = {}
  filter.filterFrom = courses[courseid].filterFrom
  filter.filterTo = courses[courseid].filterTo
  return filter
}

export function getHighestControlNumber() {
  return highestControlNumber
}

export function getNumberOfControlsOnCourse(courseid) {
  // codes list includes "S" and "F", so allow for them
  return courses[courseid].codes.length - 2
}

export function getnumberOfCourses() {
  return numberOfCourses
}

export function incrementTracksCount(courseid) {
  courses[courseid].incrementTracksCount()
  totaltracks += 1
}

export function initialiseCourses() {
  controls = new Controls()
}

export function isValidCourseId(courseid) {
  // detects the unused entries in the courses array
  // index 0 never used: some others not used if you only set up certain courses for a set of results
  return courseid in courses
}

export function saveCourses(data) {
  deleteAllCourses()
  controls.deleteAllControls()
  for (const course of data) {
    addCourse(course)
  }
  controls.generateControlList()
}

export function setAllCoursesDisplay(display) {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      courses[i].setDisplay(display)
    }
  }
}

export function setAllFilters() {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      setFilter(i)
    }
  }
}

export function setCourseDisplay(courseid, display) {
  if (courses[courseid] !== undefined) {
    courses[courseid].setDisplay(display)
    setFilter(courseid)
  }
}

export function setFilter(courseid) {
  // may come in as string or integer
  courseid = parseInt(courseid, 10)
  // assumes display properties set on courses and results before this call
  const display = courses[courseid].display || anyTracksForCourseDisplayed(courseid)
  document.querySelectorAll("[data-display]").forEach((div) => {
    if (parseInt(div.dataset.course, 10) === courseid) {
      div.dataset.display = display
    }
  })
}

export function setResultsCount() {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      courses[i].resultcount = countResultsByCourseID(i)
    }
  }
}

export function updateScoreCourse(courseid, codes, x, y) {
  for (let i = 0; i < courses.length; i += 1) {
    if (courses[i] !== undefined) {
      if (courses[i].courseid === courseid) {
        courses[i].codes = codes
        courses[i].x = x
        courses[i].y = y
        courses[i].setAngles()
        break
      }
    }
  }
}
