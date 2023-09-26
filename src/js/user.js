export class User {
  constructor(keksi) {
    this.x = ""
    this.y = keksi
    this.name = null
    this.password = null
  }

  setDetails(nameSelector, passwordSelector) {
    // mickey mouse 5 character requirement
    const regex = /...../
    this.name = document.getElementById(nameSelector).value
    const nameValid = regex.test(this.name)
    this.password = document.getElementById(passwordSelector).value
    const passwordValid = regex.test(this.password)
    return nameValid && passwordValid
  }

  alterString(input, pattern) {
    let str = ""
    for (let i = 0; i < input.length; i += 1) {
      str += input.charAt(i) + pattern.charAt(i)
    }
    return str
  }

  encodeUser() {
    return { x: this.alterString(this.name + this.password, this.y), y: this.y }
  }
}
