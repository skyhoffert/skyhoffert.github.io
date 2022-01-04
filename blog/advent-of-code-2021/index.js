
let reader = null;

const NUM_DAYS = 3;

for (let i = 1; i <= NUM_DAYS; i++) {
    let day_name = "day";

    if (i < 10) {
        day_name += "0" + i;
    } else {
        day_name += "" + i;
    }

    let element_name = day_name + "_btn";

    document.getElementById(element_name).addEventListener("click", function(evt) {
        let my_awesome_script = document.createElement("script");
        let filename = "./src/" + day_name + ".js";
        my_awesome_script.setAttribute("src", filename);
        document.head.appendChild(my_awesome_script);
    }, false);
}
