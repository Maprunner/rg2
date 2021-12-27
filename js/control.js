(function () {
  function Control(code, x, y) {
    this.code = code;
    this.x = x;
    this.y = y;
  }

  Control.prototype = {
    Constructor : Control
  };

  rg2.Control = Control;
}());