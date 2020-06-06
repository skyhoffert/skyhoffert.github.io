var access_token
var track = new Object;

const giflinks = ["https://media.giphy.com/media/4oMoIbIQrvCjm/source.gif", 
"https://media.giphy.com/media/tqfS3mgQU28ko/source.gif",
"https://media.giphy.com/media/tbapfDZ4mZJn2/source.gif",
"https://media.giphy.com/media/blSTtZehjAZ8I/source.gif",
"https://media.giphy.com/media/pa37AAGzKXoek/source.gif"];

const IP = "72.28.244.27";
const PORT = "5007";

const checkPasscode = function(guess){
    const xhr = new XMLHttpRequest();
	const pass_addr = "http://"+IP+":"+PORT+"/check_passcode";
    xhr.open(pass_addr);
    xhr.setRequestHeader('guess', guess);
    
    xhr.onload = function(){
        if (xhr.status >= 400){
            document.querySelector("#someError p").innerHTML = "Error with passcode check "+xhr.responseText;
            someError.style.display = "block";
            console.log(xhr.response);
            location.reload(true);
        } else{
            var json = JSON.parse(xhr.response)
            if(json.success === 'false'){
                location.reload(true);
                console.log(xhr.response)
            };
            access_token = json.access_token;

        }
    };

    xhr.onerror = function(){
        document.querySelector("#someError p").innerHTML = "Error with passcode check "+xhr.responseText;
        someError.style.display = "block";
        console.log(xhr.response)
        location.reload(true);
    };

    xhr.send();
};

const search = function(query){
    const promise = new Promise(function(resolve, reject){
        const xhr = new XMLHttpRequest();

        xhr.open('GET', 'https://api.spotify.com/v1/search?q='+query+'&type=track&limit=1');
        xhr.responseType = 'json';
        xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function(){
            if (xhr.status >= 400){
                reject(xhr.response);
                console.log(xhr.response)
            } else{
                resolve(xhr.response);
            }
        };

        xhr.onerror = function(){
            reject('Something went wrong!');
            console.log(xhr.response)
        };

        xhr.send();
    });
    return promise;  
};

const performRequest = function(){
    confirmSong.style.display = "none";
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.spotify.com/v1/me/player/queue?uri=spotify:track:'+track.id);
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function(){
        if (xhr.status >= 400){
            document.querySelector("#someError p").innerHTML = "Error adding song to queue :(";
            someError.style.display = "block";
            console.log(xhr.response)
            
        } else{
            document.querySelector("#successGiph p").innerHTML = "Success! '" +track.name+ "' has been added to the queue.";
            document.querySelector("#successGiph img").src = giflinks[Math.floor(Math.random() * giflinks.length)];
            successGiph.style.display = "block";
        }
    };

    xhr.onerror = function(){
        document.querySelector("#someError p").innerHTML = "Error adding song to the queue :(";
        someError.style.display = "block";
        console.log(xhr.response)
    };

    xhr.send();
};

function getSearch() {
    confirmSong.style.display = "none";
    someError.style.display = "none";
    successGiph.style.display = "none";

    var input = document.getElementById("myText").value;
    var inputData = encodeURIComponent(input);

    search(inputData)
    .then(function(responseData) {
        console.log(responseData)
        // if (responseData.tracks.items.length === 0){
        //     console.log("error catch")
        //     document.querySelector("#someError p").innerHTML = "No results found. Please refine search and try again.";
        //     someError.style.display = "block"
       // }
        track.name = responseData.tracks.items[0].name;
        track.id = responseData.tracks.items[0].id;
        track.artist = responseData.tracks.items[0].artists[0].name;
        document.querySelector("#confirmSong p").innerHTML = "Do you want to listen to '" +track.name+ "' by "+track.artist+" ?";
        confirmSong.style.display = "block";

    })
    .catch(function(err){
        document.querySelector("#someError p").innerHTML = "Error with search, please try again later.";
        someError.style.display = "block"
        console.log(err);
    });
};

var passcode = prompt("Please enter passcode", "");

if (passcode == null || passcode == "") {
  location.reload(true);
  console.log("User cancelled the prompt.");
} else {
  checkPasscode(passcode)
};

var input = document.getElementById("myText");
input.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
   event.preventDefault();
   getSearch()
  }
});
