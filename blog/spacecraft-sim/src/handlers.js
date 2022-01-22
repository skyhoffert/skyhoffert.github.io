
btn_run.addEventListener("click", function () {
	g_action_queue.push("run");

  // These lines are here for special purpose: disable any tampering until code is run or "stop".
  btn_run.disabled = true;
  txt_code.readOnly = true;
  txt_code.style.userSelect = "none";
}, false);

btn_stop.addEventListener("click", function () {
	g_action_queue.push("stop");
}, false);

btn_other.addEventListener("click", function() {
	g_action_queue.push("other");
}, false);

txt_code.addEventListener("keyup", function () {
  txt_lines.scrollTop = txt_code.scrollTop;
}, false);

txt_code.addEventListener("scroll", function () {
  txt_lines.scrollTop = txt_code.scrollTop;
}, false);
