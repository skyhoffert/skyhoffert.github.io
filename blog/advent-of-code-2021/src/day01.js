
reader = new XMLHttpRequest();

reader.onreadystatechange = function() {
    if (reader.readyState == 4 && reader.status == 200) {
        console.log("Day 01 processing started.");
        
        let file_text = reader.responseText;
    
        let lines = file_text.split("\n");
    
        let total = 0;
        let prev = parseInt(lines[0]);
        for (let i = 1; i < lines.length; i++) {
            let current = parseInt(lines[i]);
            if (current > prev) {
                total++;
            }
            prev = current;
        }
    
        let total_2 = 0;
        let val_0 = 0;
        let val_1 = 0;
        let val_2 = 0;
        let val_3 = 0;
        let window_1 = 0;
        let window_2 = 0;
        for (let i = 0; i < lines.length-3; i++) {
            val_0 = parseInt(lines[i]);
            val_1 = parseInt(lines[i+1]);
            val_2 = parseInt(lines[i+2]);
            val_3 = parseInt(lines[i+3]);
            window_1 = val_0 + val_1 + val_2;
            window_2 = val_1 + val_2 + val_3;
            if (window_2 > window_1) {
                total_2++;
            }
        }
    
        let document_out = document.getElementById("day01_out");
        document_out.innerHTML = "Part 1: " + total + " increases.";
        document_out.innerHTML += "<br>";
        document_out.innerHTML += "Part 2: " + total_2 + " increases.";
    }
}

reader.open("GET", "input/day01.txt", true);
reader.send();
