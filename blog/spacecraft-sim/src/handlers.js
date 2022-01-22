
btn_run.addEventListener("click", function () {
	g_action_queue.push("run");

  // Disable any tampering until code is run or "stop".
  SetCodeArea(false);
}, false);

btn_stop.addEventListener("click", function () {
	g_action_queue.push("stop");
}, false);

btn_other.addEventListener("click", function() {
	g_action_queue.push("other");
}, false);

btn_savecode.addEventListener("click", function() {
  let blob = new Blob([txt_code.value], {type: "text/plain;charset=utf-8"});
  let filename = "spacecraftsimulator_code_" +
    sDateString(datedelim="", timedelim="", spacer="_") +
    ".txt"
  saveAs(blob, filename);
}, false);

btn_saveout.addEventListener("click", function() {
  let blob = new Blob([txt_out.value], {type: "text/plain;charset=utf-8"});
  let filename = "spacecraftsimulator_out_" +
    sDateString(datedelim="", timedelim="", spacer="_") +
    ".txt"
  saveAs(blob, filename);
}, false);

txt_code.addEventListener("keyup", function () {
  txt_lines.scrollTop = txt_code.scrollTop;
}, false);

txt_code.addEventListener("scroll", function () {
  txt_lines.scrollTop = txt_code.scrollTop;
}, false);
