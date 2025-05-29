export class User {
  constructor() {
    this.x = ""
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

  alterString(input) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789!£$%^&+?><"
    let str = ""
    for (let i = 0; i < input.length; i += 1) {
      const rand = Math.floor(Math.random() * chars.length)
      str += input.charAt(i) + chars.charAt(rand)
    }
    return str
  }

  encodeUser() {
    return { x: this.alterString(this.name + this.password), y: this.y }
  }
}
