
function MainLoop() {

  while (g_action_queue.length > 0) {
    let action = g_action_queue.pop();
    sLogTrace("Running action: " + action);
    HandleAction(action);
  }

  requestAnimationFrame(MainLoop);
}

function Output(str) {
  txt_out.value += str + "\n";
  txt_out.scrollTop = txt_out.scrollHeight;
}

function OutputInfo(str) {
  Output("INFO: " + str);
}

function OutputDebug(str) {
  Output("DBUG: " + str);
}

function OutputError(linenum, str) {
  Output("ERR : Line " + linenum + ". " + str);
  OutputInfo("Exited with error.\n");
  HighlightOutLine(linenum);
}

function HighlightOutLine(linenum) {
    // Highlight the error line.
    let i_line_start = 0;
    for (let i = 0; i < linenum; i++) {
      i_line_start += g_line_lengths[i] + 1;
    }
    txt_code.focus();
    txt_code.setSelectionRange(i_line_start, i_line_start + g_line_lengths[linenum]);
}

function SetCodeArea(enabled) {
  if (enabled === true) {
    btn_run.disabled = false;
    txt_code.readOnly = false;
    txt_code.style.userSelect = "text";
    return;
  }
  btn_run.disabled = true;
  txt_code.readOnly = true;
  txt_code.style.userSelect = "none";
}

function HandleAction(action) {
  let tokens = action.split(" ");
  if (tokens[0] == "run") {
    g_code = txt_code.value;
    Compile();
    return;
  }
  if (tokens[0] == "stop") {
    SetCodeArea(true);
    return;
  }
  if (tokens[0] == "other") {
    OutputDebug("Other button pressed.");
  }
}

function Compile() {
  // First, output a log message indicating when the Run was started.
  let date = sDateString();
  OutputInfo("New Run. " + date);

  // Split the code into lines for later code.
  g_lines = g_code.split("\n");
  g_line_lengths = [];
  for (let i = 0; i < g_lines.length; i++) {
    g_line_lengths.push(g_lines[i].length);
  }

  // Pre-compile using spacecraft-simulator rules.
  for (let i = 0; i < g_lines.length; i++) {
    let line = g_lines[i];
    if (line.includes("console.log")) {
      OutputError(i, "console logs are not allowed.");
      return;
    }
  }

  // Retreive the code for parsing in a function.
  let func = new Function(g_code);

  // Attempt to run the code and catch any errors.
  try {
    func();
    OutputInfo("Complete.\n");
    SetCodeArea(true);
  } catch (err) {
    // Print a debug message to the output.
    let i_err_linenum = err.lineNumber - 3;
    OutputError(i_err_linenum, err.message + ".");
  }
}

requestAnimationFrame(MainLoop);
