
// Make the DIV element draggagle:
DragElement(document.getElementById("div_code"));
DragElement(document.getElementById("div_output"));
DragElement(document.getElementById("div_help"));

function DragElement(elmnt) {
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
      Focus("code");
    } else if (elmnt.id === "div_output") {
      Focus("output");
    } else if (elmnt.id === "div_help") {
      Focus("help");
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

function MinimizeElement(which) {
  document.getElementById("btn_"+which+"_minimize").addEventListener("click", function () {
    let code = document.getElementById("txt_"+which);
    let btn = document.getElementById("btn_"+which+"_minimize");
    if (code === null) {
      code = document.getElementById("div_helpcontent");
      if (code.style.display === "none") {
        code.style.display = "block";
        document.getElementById("div_helpbuttons").style.display = "block";
        btn.innerHTML = "&uarr;";
        return;
      }
      code.style.display = "none";
      document.getElementById("div_helpbuttons").style.display = "none";
      btn.innerHTML = "&darr;";
      return;
    }
    if (code.style.display === "none") {
      code.style.display = "block";
      btn.innerHTML = "&uarr;";
      return;
    }
    code.style.display = "none";
    btn.innerHTML = "&darr;";
  }, false);
}

MinimizeElement("code");
MinimizeElement("output");
MinimizeElement("help"); document.getElementById("div_helpcontent").style.display = "none";

document.getElementById("btn_recover_windows").addEventListener("click", function() {
  document.getElementById("div_code").style.left = "10px";
  document.getElementById("div_code").style.top = "50px";
  document.getElementById("div_output").style.left = "420px";
  document.getElementById("div_output").style.top = "50px";
  document.getElementById("div_help").style.left = "300px";
  document.getElementById("div_help").style.top = "10px";
  if (document.getElementById("div_helpcontent").style.display === "block") {
    let btn = document.getElementById("btn_help_minimize");
    let code = document.getElementById("div_helpcontent");
    code.style.display = "none";
    document.getElementById("div_helpbuttons").style.display = "none";
    btn.innerHTML = "&darr;";
  }
}, false);

document.getElementById("btn_tutorial").addEventListener("click", function () {
  console.log("TODO: Start the tutorial.");
}, false);

document.getElementById("btn_output_clear").addEventListener("click", function () {
  let out = document.getElementById("txt_output")
  out.value = "";
  // out.scrollTop = out.scrollHeight;
}, false);

document.getElementById("btn_code_run").addEventListener("click", function() {
  Run();
}, false);

document.getElementById("txt_code").addEventListener("click", function () {
  Focus("code");
}, false);

document.getElementById("txt_output").addEventListener("click", function () {
  Focus("output");
}, false);

document.getElementById("div_helpcontent").addEventListener("click", function () {
  Focus("help");
}, false);

function Focus(which) {
  if (which === "code") {
    document.getElementById("div_code").style.zIndex = 10;
    document.getElementById("div_output").style.zIndex = 9;
    document.getElementById("div_help").style.zIndex = 9;
  } else if (which === "output") {
    document.getElementById("div_code").style.zIndex = 9;
    document.getElementById("div_output").style.zIndex = 10;
    document.getElementById("div_help").style.zIndex = 9;
  } else if (which === "help") {
    document.getElementById("div_code").style.zIndex = 9;
    document.getElementById("div_output").style.zIndex = 9;
    document.getElementById("div_help").style.zIndex = 10;
  } else {
    console.log("Couldn't focus " + which);
  }
}
