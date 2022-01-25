
let current_scenario = "debug";

function PrintHelp() {
  let out = document.getElementById("txt_output");
  let str = "";
  if (current_scenario === "debug") {
    str += "==== Command Help ====\n";
    str += "  # [a comment]     : Ignore [a comment].\n";
    str += "  output [some txt] : Write [some txt] to output.\n";
    // str += "  stop              : Stops any movement.\n";
    // str += "  wait [sec]        : Waits [sec] seconds.\n";
    // str += "  walk [dir]        : Walks [dir] indefinitely.\n";
    str += "  walk [dir] [dist] : Walks [dir] [dist] units.\n";
    str += "==== Values: ====\n";
    str += "  [a comment]: String.\n";
    str += "  [some txt]: String.\n";
    // str += "  [sec]: Float. Units of seconds.\n";
    str += "  [dir]: String. \"up\", \"down\", \"left\", or \"right\".\n";
    str += "  [dist]: Float. Distance in world units.\n";
  }
  out.value += str;
  out.scrollTop = out.scrollHeight;
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
  if (line[0] === "#") {

    next_command_time = 500;

  } else if (tokens[0] === "output") {

    tokens.splice(0,1);
    let outtxt = tokens.join(" ");
    Output(outtxt);
    next_command_time = 1000;

  } else if (tokens[0] === "walk") {

    if (tokens.length != 3) {
      OutputError(linenum_txt, "Invalid format.");
      return;
    }

    let dir = tokens[1];
    let dist = tokens[2];

    next_command_time = 1000;

  } else {
    
    OutputError(linenum_txt,"Unknown command \"" + line + "\".");
    next_command_time = -1;

  }

  // Catch any errors.
  if (next_command_time <= 0) {
    return;
  }

  // Otherwise, push a lerper to run the next command in some time.
  G_lerpers["nextline"] = new Lerper(next_command_time, function(el,d) {
    if (d) {
      RunLine(linenum+1);
    }
  });
}
