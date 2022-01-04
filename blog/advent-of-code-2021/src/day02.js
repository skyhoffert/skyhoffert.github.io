
reader = new XMLHttpRequest();

reader.onreadystatechange = function() {
    if (reader.readyState == 4 && reader.status == 200) {
        console.log("Day 02 processing started.");

        let document_out = document.getElementById("day02_out");

        let file_text = reader.responseText;
        let lines = file_text.split("\n");

        // Part 1.
        let pos_horizontal = 0;
        let pos_depth = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let tokens = line.split(" ");

            let direction = tokens[0];
            let distance = parseInt(tokens[1]);

            if (direction == "forward") {
                pos_horizontal += distance;
            } else if (direction == "up") {
                pos_depth -= distance;
            } else if (direction == "down") {
                pos_depth += distance;
            }
        }

        let pos_product = pos_horizontal * pos_depth;
        
        document_out.innerHTML = "Horizontal = " + pos_horizontal + ", Depth = " + pos_depth + ", Product = " + pos_product;
        document_out.innerHTML += "<br>";

        // Part 2.
        let aim = 0;
        pos_horizontal = 0;
        pos_depth = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let tokens = line.split(" ");

            let direction = tokens[0];
            let distance = parseInt(tokens[1]);

            if (direction == "forward") {
                pos_horizontal += distance;
                pos_depth += distance * aim;
            } else if (direction == "up") {
                aim -= distance;
            } else if (direction == "down") {
                aim += distance;
            }
        }

        pos_product = pos_horizontal * pos_depth;

        document_out.innerHTML += "Horizontal = " + pos_horizontal + ", Depth = " + pos_depth + ", Product = " + pos_product;
    }
}

reader.open("GET", "input/day02.txt", true);
reader.send();
