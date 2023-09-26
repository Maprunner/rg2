import { extractTextContentZero, formatSecsAsMMSS, getSecsFromHHMMSS, showWarningDialog } from "./utils"

export class ResultParserIOFV3 {
  constructor(xml) {
    this.results = []
    this.valid = true
    this.processIOFV3Results(xml)
    return { results: this.results, valid: this.valid }
  }

  extractIOFV3Results(resultlist, result) {
    for (let k = 0; k < resultlist.length; k += 1) {
      result.chipid = extractTextContentZero(resultlist[k].getElementsByTagName("ControlCard"), 0)
      result.position = extractTextContentZero(resultlist[k].getElementsByTagName("Position"), "")
      if (result.position === "0") {
        result.position = ""
      }
      result.status = extractTextContentZero(resultlist[k].getElementsByTagName("Status"), "")
      // assuming first <Time> is the total time...
      // this one is in seconds and might even have tenths...
      result.time = this.getTotalTimeAsSeconds(resultlist[k].getElementsByTagName("Time"))
      result.starttime = this.getStartFinishTimeAsSeconds(
        extractTextContentZero(resultlist[k].getElementsByTagName("StartTime"), 0)
      )
      result.splits = ""
      result.codes = []
      const splitlist = resultlist[k].getElementsByTagName("SplitTime")
      this.extractIOFV3Splits(splitlist, result)
      const finishtime = this.getStartFinishTimeAsSeconds(
        extractTextContentZero(resultlist[k].getElementsByTagName("FinishTime"), 0)
      )
      if (finishtime > 0) {
        result.splits += finishtime - result.starttime
      } else {
        result.splits += 0
      }
    }
  }

  extractIOFV3Splits(splitlist, result) {
    let codes = []
    for (let x = 0; x < splitlist.length; x += 1) {
      // no attributes means just a standard split with time and control code
      if (splitlist[x].attributes.length === 0) {
        result.splits += extractTextContentZero(splitlist[x].getElementsByTagName("Time"), 0)
        codes.push(extractTextContentZero(splitlist[x].getElementsByTagName("ControlCode"), "X" + x))
        result.splits += ";"
      } else {
        // possible status attributes are "Missing" and "Additional"
        // need to insert a dummy 0 time for missing splits
        if (splitlist[x].getAttribute("status") === "Missing") {
          result.splits += "0"
          codes.push(extractTextContentZero(splitlist[x].getElementsByTagName("ControlCode"), "X" + x))
          result.splits += ";"
        }
      }
    }
    result.codes = codes
    result.controls = result.codes.length
  }

  getClub(element) {
    if (element.length > 0) {
      if (element[0].getElementsByTagName("Name")[0]) {
        return element[0].getElementsByTagName("Name")[0].textContent
      }
    }
    return ""
  }

  getID(element, index) {
    if (element.length > 0) {
      let text = element[0].textContent
      // remove new lines from empty <Id> tags
      text.replace(/[\n\r]/g, "")
      return text.trim()
    }
    // no id defined so just use result index
    return index
  }

  getStartFinishTimeAsSeconds(time) {
    if (time.length >= 19) {
      // format is yyyy-mm-ddThh:mm:ss and might have extra Z or +nn
      return getSecsFromHHMMSS(time.substr(11, 8))
    }
    return 0
  }

  getTotalTimeAsSeconds(time) {
    if (time.length > 0 && time[0].textContent) {
      const timeInt = parseInt(time[0].textContent, 10)
      return formatSecsAsMMSS(timeInt)
    }
    return "00:00"
  }

  processIOFV3Results(xml) {
    try {
      const classlist = xml.getElementsByTagName("ClassResult")
      for (let i = 0; i < classlist.length; i += 1) {
        const classes = classlist[i].getElementsByTagName("Class")
        const course = classes[0].getElementsByTagName("Name")[0].textContent
        const personlist = classlist[i].getElementsByTagName("PersonResult")
        for (let j = 0; j < personlist.length; j += 1) {
          let result = {}
          result.course = course
          const temp =
            personlist[j].getElementsByTagName("Given")[0].textContent +
            " " +
            personlist[j].getElementsByTagName("Family")[0].textContent
          // remove new lines from empty <Given> and <Family> tags
          result.name = temp.replace(/[\n\r]/g, "").trim()
          result.dbid = this.getID(personlist[j].getElementsByTagName("Id"), j)
          result.club = this.getClub(personlist[j].getElementsByTagName("Organisation"))
          const resultlist = personlist[j].getElementsByTagName("Result")
          this.extractIOFV3Results(resultlist, result)
          if (result.status !== "DidNotStart") {
            this.results.push(result)
          }
        }
      }
    } catch (err) {
      this.valid = false
      showWarningDialog("XML parse error", "Error processing XML file. Error is : " + err.message)
      return
    }
  }
}
