import { extractAttributeZero, extractTextContentZero, getSecsFromHHMMSS, showWarningDialog } from "./utils"

export class ResultParserIOFV2 {
  constructor(xml) {
    this.results = []
    this.valid = true
    this.processIOFV2Results(xml)
    return { results: this.results, valid: this.valid }
  }

  extractIOFV2Results(resultlist, result) {
    for (let i = 0; i < resultlist.length; i += 1) {
      result.status = extractAttributeZero(resultlist[i].getElementsByTagName("CompetitorStatus"), "value", "")
      result.position = this.getPosition(resultlist[i].getElementsByTagName("ResultPosition"))
      result.chipid = extractTextContentZero(resultlist[i].getElementsByTagName("CCardId"), 0)
      // assuming first <Time> is the total time...
      result.time = this.getTime(resultlist[i].getElementsByTagName("Time"))
      result.starttime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName("StartTime"))
      result.splits = ""
      result.codes = []
      const splitlist = resultlist[i].getElementsByTagName("SplitTime")
      result.controls = splitlist.length
      this.extractIOFV2Splits(splitlist, result)
      const finishtime = this.getStartFinishTimeAsSecs(resultlist[i].getElementsByTagName("FinishTime"))
      result.splits += Math.max(finishtime - result.starttime, 0)
    }
  }

  extractIOFV2Splits(splitlist, result) {
    for (let l = 0; l < splitlist.length; l += 1) {
      if (l > 0) {
        result.splits += ";"
      }
      const temp = splitlist[l].getElementsByTagName("Time")
      if (temp.length > 0) {
        // previously read timeFormat but some files lied!
        // allow for XML files that don't tell you what is going on
        // getSecsFromHHMMSS copes with MM:SS as well
        result.splits += getSecsFromHHMMSS(temp[0].textContent)
        result.codes[l] = extractTextContentZero(splitlist[l].getElementsByTagName("ControlCode"), "")
      } else {
        result.splits += 0
        result.codes[l] = ""
      }
    }
    // add finish split
    result.splits += ";"
  }

  getDBID(element, index) {
    if (element.length === 0) {
      return index
    }
    // remove new lines from empty <PersonId> tags
    element = element[0].textContent.replace(/[\n\r]/g, "").trim()
    if (element) {
      return element
    }
    return index
  }

  getName(personlist) {
    const temp =
      personlist.getElementsByTagName("Given")[0].textContent +
      " " +
      personlist.getElementsByTagName("Family")[0].textContent
    // remove new lines from empty <Given> and <Family> tags
    return temp.replace(/[\n\r]/g, "").trim()
  }

  getPosition(element) {
    if (element.length > 0) {
      return parseInt(element[0].textContent, 10)
    }
    return ""
  }

  getStartFinishTimeAsSecs(element) {
    if (element.length > 0) {
      const time = element[0].getElementsByTagName("Clock")[0].textContent
      return getSecsFromHHMMSS(time)
    }
    return 0
  }

  getTime(element) {
    if (element.length > 0) {
      return element[0].textContent.replace(/[\n\r]/g, "")
    }
    return ""
  }

  processIOFV2Results(xml) {
    try {
      const classlist = xml.getElementsByTagName("ClassResult")
      for (let i = 0; i < classlist.length; i += 1) {
        const course = classlist[i].getElementsByTagName("ClassShortName")[0].textContent
        const personlist = classlist[i].getElementsByTagName("PersonResult")
        for (let j = 0; j < personlist.length; j += 1) {
          let result = {}
          result.course = course
          result.name = this.getName(personlist[j])
          result.dbid = this.getDBID(personlist[j].getElementsByTagName("PersonId"), j)
          result.club = extractTextContentZero(personlist[j].getElementsByTagName("ShortName"), "")
          const resultlist = personlist[j].getElementsByTagName("Result")
          this.extractIOFV2Results(resultlist, result)
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
