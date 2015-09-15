
module.exports = {

  getViewPortInfo: function getViewPort () {
    var e = document.documentElement;
    var g = document.getElementsByTagName('body')[0],
    var x = window.innerWidth || e.clientWidth || g.clientWidth,
    var y = window.innerHeight || e.clientHeight || g.clientHeight

    return {
      width: x,
    	height: y
    }
  }


}
