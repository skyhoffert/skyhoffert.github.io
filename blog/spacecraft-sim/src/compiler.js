
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
}

function HandleAction(action) {
  let tokens = action.split(" ");
  if (tokens[0] == "run") {
    g_code = txt_code.value;
    Compile();
    return;
  }
  if (tokens[0] == "stop") {
    btn_run.disabled = false;
    txt_code.readOnly = false;
    txt_code.style.userSelect = "text";
    return;
  }
  if (tokens[0] == "other") {
    txt_out.value += "Other button pressed.\n";
    txt_out.scrollTop = txt_out.scrollHeight;
  }
}

function Compile(code) {
  g_lines = g_code.split("\n");
  g_line_lengths = [];
  for (let i = 0; i < g_lines.length; i++) {
    g_line_lengths.push(g_lines[i].length);
  }

  g_code_linenum = 0;

  let i_err_linenum = -1;

  for (let i = 0; i < g_lines.length; i++) {
    let valid_basic_syntax = BasicSyntaxCheck(g_lines[i], i);
    if (valid_basic_syntax === false) {
      i_err_linenum = i;
      break;
    }
  }

  if (i_err_linenum !== -1) {
    let i_line_start = 0;
    for (let i = 0; i < i_err_linenum; i++) {
      i_line_start += g_line_lengths[i] + 1;
    }
    txt_code.focus();
    txt_code.setSelectionRange(i_line_start, i_line_start + g_line_lengths[i_err_linenum]);
  }
}

function BasicSyntaxCheck(line, linenum) {
  let tokens = line.split(" ");

  if (k_opcodes.hasOwnProperty(tokens[0]) === false) {
    Output("ERR. Line " + linenum + ". Unknown opcode \"" + tokens[0] + "\".");
    return false;
  }

  return true;
}

requestAnimationFrame(MainLoop);
