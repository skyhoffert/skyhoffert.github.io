
reader = new XMLHttpRequest();

reader.onreadystatechange = function() {
    if (reader.readyState == 4 && reader.status == 200) {
        console.log("Day 03 processing started.");

        let document_out = document.getElementById("day03_out");
        document_out.innerHTML = "";

        let file_text = reader.responseText;
        let lines = file_text.split("\n");

        // Part 1.
        let line_len = lines[0].length;
        let ones = [];
        let result = [];
        for (let i = 0; i < line_len; i++) {
            ones.push(0);
            result.push(0);
        }

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            for (let j = 0; j < line_len; j++) {
                let val = parseInt(line[j]);
                ones[j] += val;
            }
        }

        for (let i = 0; i < line_len; i++) {
            result[i] = ones[i] >= lines.length/2 ? 1 : 0;
        }

        let gamma_rate = 0;
        let epsilon_rate = 0;

        for (let i = line_len-1; i >= 0; i--) {
            gamma_rate += result[i] * 2**((line_len - i) - 1);
            epsilon_rate += ((result[i]-1)*-1) * 2**((line_len - i) - 1);
        }

        let total = gamma_rate * epsilon_rate;

        document_out.innerHTML += "Result = " + result + ", Gamma = " + gamma_rate + ", Epsilon = " + epsilon_rate + ", Total = " + total;
        document_out.innerHTML += "<br>";

        // Part 2.
        // TODO: recalculate most common bit, rather than using "result".
        let o2_lines = JSON.parse(JSON.stringify(lines));
        let co2_lines = JSON.parse(JSON.stringify(lines));

        Reduce(o2_lines, 0, result, false);
        Reduce(co2_lines, 0, result, true);

        o2_lines = o2_lines[0];
        co2_lines = co2_lines[0];

        let o2_val = 0;
        let co2_val = 0;

        console.log(o2_lines);

        for (let i = line_len-1; i >= 0; i--) {
            o2_val += parseInt(o2_lines[i]) * 2**((line_len - i) - 1);
            co2_val += parseInt(co2_lines[i]) * 2**((line_len - i) - 1);
        }

        total = o2_val * co2_val;

        // 4172330 is too high!

        document_out.innerHTML += "o2_lines = " + o2_lines + ", co2_lines = " + co2_lines + ", Total = " + total;
    }
}

function Reduce(ar, bp, result, inv) {
    if (ar.length <= 1) { return 0; }

    let removes = [];
    for (let i = 0; i < ar.length; i++) {
        let strbit = "";
        if (inv) {
            strbit += (result[bp]-1) * -1;
        } else {
            strbit += result[bp];
        }

        if (ar[i][bp] != strbit) {
            removes.push(i);
        }
    }

    while (removes.length > 0) {
        ar.splice(removes[0], 1);
        removes.splice(0, 1);
        for (let i = 0; i < removes.length; i++) {
            removes[i]--;
        }
    }

    console.log(ar);
    return Reduce(ar, bp+1, result, inv);
}

reader.open("GET", "input/day03.txt", true);
reader.send();
