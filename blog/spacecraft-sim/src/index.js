
let btn_run = document.getElementById("btn_run");
let btn_stop = document.getElementById("btn_stop");
let btn_other = document.getElementById("btn_other");
let btn_savecode = document.getElementById("btn_savecode");
let btn_saveout = document.getElementById("btn_saveout");
let txt_lines = document.getElementById("txt_lines");
let txt_code = document.getElementById("txt_code");
let txt_out = document.getElementById("txt_out");

let g_action_queue = [];

for (let i = 0; i < 100; i++) {
	txt_lines.value += "" + i + ":\n";
}

let g_compiling = false;
let g_code = "";
let g_lines = "";
let g_line_lengths = [];
