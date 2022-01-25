
//Make the DIV element draggagle:
dragElement(document.getElementById("div_code"));
dragElement(document.getElementById("div_output"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  document.getElementById(elmnt.id + "_header").onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
    
    if (elmnt.id === "div_code") {
      document.getElementById("div_code").style.zIndex = 10;
      document.getElementById("div_output").style.zIndex = 9;
    } else {
      document.getElementById("div_code").style.zIndex = 9;
      document.getElementById("div_output").style.zIndex = 10;
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

document.getElementById("btn_code_minimize").addEventListener("click", function () {
  let code = document.getElementById("txt_code");
  let btn = document.getElementById("btn_code_minimize");
  let res = document.getElementById("img_resize_code");
  if (code.style.display === "none") {
    code.style.display = "block";
    btn.innerHTML = "&uarr;";
    return;
  }
  code.style.display = "none";
  btn.innerHTML = "&darr;";
}, false);

document.getElementById("btn_output_minimize").addEventListener("click", function () {
  let code = document.getElementById("txt_output");
  let btn = document.getElementById("btn_output_minimize");
  if (code.style.display === "none") {
    code.style.display = "block";
    btn.innerHTML = "&uarr;";
    return;
  }
  code.style.display = "none";
  btn.innerHTML = "&darr;";
}, false);

document.getElementById("btn_recover_windows").addEventListener("click", function() {
  document.getElementById("div_code").style.left = "10px";
  document.getElementById("div_code").style.top = "40px";
  document.getElementById("div_output").style.left = "420px";
  document.getElementById("div_output").style.top = "40px";
}, false);

document.getElementById("btn_output_clear").addEventListener("click", function () {
  let out = document.getElementById("txt_output")
  out.value = "";
  // out.scrollTop = out.scrollHeight;
}, false);

document.getElementById("btn_code_help").addEventListener("click", function() {
  PrintHelp();
}, false);

document.getElementById("btn_code_run").addEventListener("click", function() {
  Run();
}, false);
