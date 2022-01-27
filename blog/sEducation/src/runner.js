
let current_scenario = "debug";

function AddHelpButton(which) {
  let div_buttons = document.getElementById("div_helpbuttons");
  let cmd = document.getElementById("help_cmd");
  let fmt = document.getElementById("help_fmt");
  let descr = document.getElementById("help_descr");

  let btn = document.createElement("button");
  btn.className = "btn_help_class";
  btn.id = "btn_help_"+which;
  btn.innerHTML = which;

  if (which === "#") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "#: Comment. Allows the user to add comments to their code. Anything " +
        "following the \"#\" symbol is ignored.";
      fmt.innerHTML = "# [comment]<br>#[comment]";
      descr.innerHTML = "[comment]: String.";
    }, false);

  } else if (which === "output") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "output: Write a given string.";
      fmt.innerHTML = "output [text]";
      descr.innerHTML = "[text]: String. Can include spaces.";
    }, false);

  } else if (which === "pickup") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "pickup: Attempt to make the player character pick up an object.";
      fmt.innerHTML = "pickup";
      descr.innerHTML = "";
    }, false);

  } else if (which === "use") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "use: Attempt to make the player character the held item.";
      fmt.innerHTML = "use";
      descr.innerHTML = "";
    }, false);

  } else if (which === "wait") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "wait: Command the player character to wait for a given duration.";
      fmt.innerHTML = "wait [duration]";
      descr.innerHTML = "[duration]: Float. Number of seconds to wait for.";
    }, false);
    
  } else if (which === "walk") {

    btn.addEventListener("click", function () {
      cmd.innerHTML = "walk: Command the player character to walk in a given direction for a " +
        "given duration.";
      fmt.innerHTML = "walk [direction] [duration]";
      descr.innerHTML = "[direction]: String. One of \"up\", \"down\", \"left\", \"right\"." +
        "<br><br>[duration]: Float. Number of seconds to walk for.";
    }, false);

  } else {
  }

  div_buttons.append(btn);
}

function PrintHelp() {

  if (current_scenario === "debug") {

    // Now, add buttons to the help window.
    let btn = null;
    AddHelpButton("#");
    AddHelpButton("output");
    AddHelpButton("pickup");
    AddHelpButton("wait");
    AddHelpButton("walk");
    AddHelpButton("use");

  }
}

function OutputRaw(str) {
  document.getElementById("txt_output").value += str + "\n";
}

function Output(str) {
  OutputRaw("> " + str);
}

function OutputError(linenum, str) {
  OutputRaw("E " + linenum + ": " + str);
}

let G_code = "";
let G_lines = [];
let G_line_lengths = [];

function Run() {
  G_code = document.getElementById("txt_code").value;
  G_lines = G_code.split("\n");

  for (let i = 0; i < G_lines.length; i++) {
    G_line_lengths[i] = G_lines[i].length;
  }

  OutputRaw("==== Run Started  " + sDateString() + " ====");

  RunLine(0);
}

function RunLine(linenum) {
  if (linenum >= G_lines.length) {
    OutputRaw("==== Run Complete " + sDateString() + " ====\n");
    return;
  }

  // Highlight the error line.
  let i_line_start = 0;
  for (let i = 0; i < linenum; i++) {
    i_line_start += G_line_lengths[i] + 1;
  }
  txt_code.focus();
  txt_code.setSelectionRange(i_line_start, i_line_start + G_line_lengths[linenum]);

  let line = G_lines[linenum];
  let tokens = line.split(" ");
  let linenum_txt = linenum + 1;

  // For empty lines, move quickly.
  if (line.length === 0) {
    G_lerpers["nextline"] = new Lerper(100, function(el,d) {
      if (d) {
        RunLine(linenum+1);
      }
    });
    return;
  }
  
  // Otherwise, handle the next action in some time.
  let next_command_time = -1; // ms
  let lerper_func = function () {};

  if (line[0] === "#") {

    next_command_time = 0;

  } else if (tokens[0] === "output") {

    tokens.splice(0,1);
    let outtxt = tokens.join(" ");
    Output(outtxt);
    next_command_time = 0;

  } else if (tokens[0] === "wait") {

    if (tokens.length !== 2) {
      OutputError(linenum_txt, "Invalid format.");
      return;
    }

    let dur = tokens[1];
    let v_dur = parseFloat(dur);
    if (v_dur === NaN) {
      OutputError(linenum_txt, "Invalid dur \"" + dur + "\".");
      return;
    }

    next_command_time = v_dur * 1000;

  } else if (tokens[0] === "walk") {

    if (tokens.length !== 3) {
      OutputError(linenum_txt, "Invalid format.");
      return;
    }

    let dir = tokens[1];
    if (!(dir === "up" || dir === "down" || dir === "left" || dir === "right")) {
      OutputError(linenum_txt, "Unknown dir \"" + dir + "\".");
      return;
    }
    let x_vel = 0;
    let y_vel = 0;
    let move_speed = 2;
    if (dir === "up") {
      y_vel = -1*move_speed;
    } else if (dir === "down") {
      y_vel = move_speed;
    } else if (dir === "left") {
      x_vel = -1*move_speed;
    } else if (dir === "right") {
      x_vel = move_speed;
    }

    let dur = tokens[2];
    let v_dur = parseFloat(dur);
    if (v_dur === NaN) {
      OutputError(linenum_txt, "Invalid dur \"" + dur + "\".");
      return;
    }

    next_command_time = v_dur * 1000;
    lerper_func = function () {
      G_stage.MovePlayer(x_vel, y_vel);
      // G_stage.sprites.player.x += x_vel;
      // G_stage.sprites.player.y += y_vel;
    };

  } else {
    
    OutputError(linenum_txt,"Unknown command \"" + line + "\".");
    next_command_time = -1;

  }

  // If there is NO wait time, run next command now.
  if (sFuzzyEquals(next_command_time, 0)) {
    RunLine(linenum+1);
    return;
  }

  // Catch any errors (-1 valued).
  if (next_command_time < 0) {
    console.log("Error caught in runner.");
    return;
  }

  // Otherwise, push a lerper to run the next command in some time.
  G_lerpers["nextline"] = new Lerper(next_command_time, function(el,d) {
    if (d) {
      RunLine(linenum+1);
    }
    lerper_func();
  });
}
