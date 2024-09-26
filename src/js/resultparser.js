import { config } from "./config"
import { ResultParserCSV } from "./resultparsercsv"
import { ResultParserIOFV2 } from "./resultparseriofv2"
import { ResultParserIOFV3 } from "./resultparseriofv3"
import { extractAttributeZero, showWarningDialog } from "./utils"

export class ResultParser {
  constructor(e, fileFormat) {
    this.results = []
    this.resultCourses = []
    this.valid = true
    const parsedResults = this.processResults(e, fileFormat)
    this.results = parsedResults.results
    this.valid = parsedResults.valid
    this.getCoursesFromResults()
    return {
      results: this.results,
      resultCourses: this.resultCourses,
      valid: this.valid
    }
  }

  getCoursesFromResults() {
    // creates an array of all course names in the results file
    for (let i = 0; i < this.results.length; i += 1) {
      // have we already found this course?
      let found = false
      for (let j = 0; j < this.resultCourses.length; j += 1) {
        if (this.resultCourses[j].course === this.results[i].course) {
          found = true
          break
        }
      }
      if (!found) {
        // courseid is set later when mapping is known
        this.resultCourses.push({
          course: this.results[i].course,
          courseid: config.DO_NOT_SAVE_COURSE
        })
      }
    }
  }

  processResults(e, fileFormat) {
    switch (fileFormat) {
      case "CSV":
        return new ResultParserCSV(e.target.result)
      case "XML":
        return this.processResultsXML(e.target.result)
      default:
        // shouldn't ever get here but...
        showWarningDialog("File type error", "Results file type is not recognised. Please select a valid file.")
        return { results: [], valid: false }
    }
  }

  processResultsXML(rawXML) {
    let version = ""
    let xml = undefined
    try {
      xml = new DOMParser().parseFromString(rawXML, "text/xml")
      const nodelist = xml.getElementsByTagName("ResultList")
      if (nodelist.length === 0) {
        showWarningDialog("XML file error", "File is not a valid XML results file. ResultList element missing.")
        return { results: [], valid: false }
      }
      // test for IOF Version 2
      version = extractAttributeZero(xml.getElementsByTagName("IOFVersion"), "version", "")
      if (version === "") {
        // test for IOF Version 3
        version = extractAttributeZero(xml.getElementsByTagName("ResultList"), "iofVersion", "")
      }
    } catch (err) {
      showWarningDialog("XML file error", "File is not a valid XML results file.")
      return { results: [], valid: false }
    }

    switch (version) {
      case "2.0.3":
        return new ResultParserIOFV2(xml)
      case "3.0":
        return new ResultParserIOFV3(xml)
      default:
        showWarningDialog("XML file error", "Invalid IOF file format. Version " + version + " not supported.")
        return { results: [], valid: false }
    }
  }
}
