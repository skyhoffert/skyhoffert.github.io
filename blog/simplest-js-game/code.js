//
// Very simple JS game code!
// I'll try to keep it short and simple :)
// Last Modified December 19, 2019
// Sky Hoffert
//

// This file is very "script" like. As in it runs line by line until the end. It gets a little
// messy towards the bottom, but overall the flow is top down! Good Luck!

// First, we need a way to draw things on the screen.
// We can do this with something called a "canvas". It is a normal HTML object that is available
// in almost all modern browsers. That is important so that different browsers could still be able
// to run the game!
// We have already created this element in page.html, so we can reference it using the "document"
// object, which has all the html stuff stored in it. Using the method "getElementById", we can
// ask the document for the canvas element. I gave it the unique id "gameCanvas".
var canvas = document.getElementById("gameCanvas");

// The syntax of the above lines is important and we will see it often. I'll dissect it:
// var : Lets js know we want to create a "variable".
// canvas : The name of the variable we are creating.
// = : Whatever is on the left will hold the final value of what runs on the right.
//     In this case, there is a function being called that will "return" a value.
// document : A built in JS "class" that holds HTML related stuff.
// . : IMPORTANT! The dot means we want something from a particular class. The syntax is:
//     <class name>.<function/variable>. Functions needs parentheses with values inside.
//     variables do not need parentheses as they are just one value.
// getElementById : The name of the function contained in document we want to use.
//                  We know it is a function because there are parentheses after it!
// () : Parentheses are related to functions. They pass given values to be handled.
//      Anything inside of them will be sent to the function, provided that the number matches
//      what is expected. This is rather complicated but important!
// "gameCanvas" : A STRING that we want to send to the previous function.

// We can draw all willy nilly, but we are bound to a certain canvas size. Anything outside of
// the screen cannot be seen by the user, so we don't want to draw it. We can ask for the max
// width and height of the canvas element that the "document" gave us with these fields,
// "offsetWidth", and "offsetHeight". 
// I am going to save these values in a CONSTANT variable. This means it will not change during
// the entire life of our program! We need to refresh the page if we want this value to be updated.
// Variables created with "var" can always be updated in the future. This is not the case for
// "const" variables.
const WIDTH = canvas.offsetWidth;
const HEIGHT = canvas.offsetHeight;

// Note that this time, we are getting variables from the canvas class. There are no parentheses.

// Now, we want to make sure our canvas is scaled correctly for the given bounds. If we didn't run
// these commands, the canvas may not be the correct size or blurry or something.
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Now, the most important variable that we will reference for the actual drawing. "canvas" is
// sort of a container, where "context" will be the actual drawing surface. Notice again we are
// using a function to get this variable from the canvas.
var context = canvas.getContext("2d");

// Cool! So we can now start drawing! The first, most basic thing to do is to just fill the screen
// with a solid color. I almost always start with a black screen, so that's how we'll start!
// First, we have to tell the context what COLOR to use for any commands it sees until another
// color is given. We do this by setting a variable in the context class called "fillStyle". This
// variable should be a string containing the name of a color.
context.fillStyle = "black";
// Now, we can actually draw a rectanvle with this function, "fillRect". It will basically... you
// guessed it, fill a rectangle!
context.fillRect(0, 0, WIDTH, HEIGHT);

// Setting some constants for later. We will use a frame rate of 30 Frames Per Second.
// FRAME_RATE is then calculated as number of milliseconds (thousandth of second).
const FPS = 30;
const FRAME_RATE = 1000/30;

// Now is a confusing command. setInterval is a built in JS function that calls a given function,
// in this case called "Update" once every "FRAME_RATE" milliseconds. This will be the main update
// "loop" for this program.
setInterval(Update, FRAME_RATE);

// Now, we can start doing real game stuff. I'm going to create some variables to describe a ball
// that will bounce around the screen. "ballX" and "ballY" describe the position of the ball at
// any given frame (we will update this to move the ball). "ballSpeedX" and "ballSpeedY" control
// how quickly the ball moves across the screen. You will see these used below.
var ballX = WIDTH/4;
var ballY = HEIGHT/2;
var ballRadius = 40;
var ballSpeedX = 8;
var ballSpeedY = 7;

// To make things more interesting, I will make another ball that bounces around the screen, but
// with a different starting position and velocity.
var ball2X = WIDTH*3/4;
var ball2Y = HEIGHT/2;
var ball2Radius = 30;
var ball2SpeedX = -6;
var ball2SpeedY = -9;

// Okay, so here is the "Update" function itself. This will be called once per frame, so we need
// to do everything that our game requires within this function. We need to update the balls, maybe
// check for collision if that is a part of the game, and then draw to the canvas/context elements
// that we have already created. Let's check it out.
function Update() {
    // The first thing we do is simply move the balls with the ball speed values.
    // these lines translate to this (both lines are equivalent).
    // ballX += ballSpeedX;
    // ballX = ballX + ballSpeedX;
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Now, we need to keep the ball on the screen! Otherwise, it would continuously travel forever
    // and never come back. We can flip the velocity if the ball goes to far right or left.
    // This is a remarkably simple solution, but may not be perfect.
    if (ballX > WIDTH) {
        ballSpeedX = -ballSpeedX;
    }
    else if (ballX < 0) {
        ballSpeedX = -ballSpeedX;
    }

    // Same thing, but now for the Y.
    if (ballY > HEIGHT) {
        ballSpeedY = -ballSpeedY;
    }
    else if (ballY < 0) {
        ballSpeedY = -ballSpeedY;
    }
    
    // The lines below are essentially the same, just now taking care of ball2.
    ball2X += ball2SpeedX;
    ball2Y += ball2SpeedY;

    if (ball2X > WIDTH) {
        ball2SpeedX = -ball2SpeedX;
    }
    else if (ball2X < 0) {
        ball2SpeedX = -ball2SpeedX;
    }
    
    if (ball2Y > HEIGHT) {
        ball2SpeedY = -ball2SpeedY;
    }
    else if (ball2Y < 0) {
        ball2SpeedY = -ball2SpeedY;
    }

    // The balls are bouncing around the screen, but if you ran this program without the lines
    // below, it would be impossible to tell! We haven't drawn anything to the screen yet! Let's
    // do just that.

    // For most games, the screen is actually cleared on every single frame. You don't have to do
    // do this, and many advanced games don't but for this simple game, it isn't a big deal.
    // Clear the screen before drawing objects to it.
    context.fillStyle = "black";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // Now, drawing the objects is rather simple because there are just 2 of them.

    // First, like before we will tell the context class what color object we want to draw. I'll
    // draw the first ball as light blue.
    context.fillStyle = "lightblue";
    
    // This part is a bit tricky. "beginPath" and "closePath" are just a way to draw a polygon
    // through the context object. In this case, the polygon is actually a circle that represents
    // the balls. We can use the "arc" function of the "context" class for that.
    context.beginPath();
    // Here is the arc command. The first two parameters are x and y coordinates. The third is
    // radius. The fourth value is the starting angle of the arc we would like to draw and the
    // fifth value is the end angle. If you've ever taken a trigonometry class, you may recognize
    // this as angles in RADIANS. 360 degrees = 2*pi radians. (full circle)
    context.arc(ballX, ballY, ballRadius, 0, 2*Math.PI);
    context.closePath();
    // Finally fill the circle with the color we chose above. Nothing would appear until we run
    // this command to actually fill the polygon (circle).
    context.fill();
    
    // I'll draw the second ball as pink. The commands are essentially the same, just for ball2.
    context.fillStyle = "pink";
    context.beginPath();
    context.arc(ball2X, ball2Y, ball2Radius, 0, 2*Math.PI);
    context.closePath();
    context.fill();
}

// And that's it! I recommend you go through this, make changes to values and observe how those
// changes manifest themselves on the screen. You could even build upon this to make it more
// interactive or interesting. Perhaps the balls have collision between them and they sort of
// bounce off each other. The possibilities are endless!

/*
Below you will find the same script, but with no comments. The characters above signify what is
called a "multi-line comment" that will go until we see the end character sequence.

var canvas = document.getElementById("gameCanvas");

const WIDTH = canvas.offsetWidth;
const HEIGHT = canvas.offsetHeight;

canvas.width = WIDTH;
canvas.height = HEIGHT;

var context = canvas.getContext("2d");

context.fillStyle = "black";
context.fillRect(0, 0, WIDTH, HEIGHT);

const FPS = 30;
const FRAME_RATE = 1000/30;

setInterval(Update, FRAME_RATE);

var ballX = WIDTH/4;
var ballY = HEIGHT/2;
var ballRadius = 40;
var ballSpeedX = 8;
var ballSpeedY = 7;

var ball2X = WIDTH*3/4;
var ball2Y = HEIGHT/2;
var ball2Radius = 30;
var ball2SpeedX = -6;
var ball2SpeedY = -9;

function Update() {
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballX > WIDTH) {
        ballSpeedX = -ballSpeedX;
    }
    else if (ballX < 0) {
        ballSpeedX = -ballSpeedX;
    }

    if (ballY > HEIGHT) {
        ballSpeedY = -ballSpeedY;
    }
    else if (ballY < 0) {
        ballSpeedY = -ballSpeedY;
    }
    
    ball2X += ball2SpeedX;
    ball2Y += ball2SpeedY;

    if (ball2X > WIDTH) {
        ball2SpeedX = -ball2SpeedX;
    }
    else if (ball2X < 0) {
        ball2SpeedX = -ball2SpeedX;
    }
    
    if (ball2Y > HEIGHT) {
        ball2SpeedY = -ball2SpeedY;
    }
    else if (ball2Y < 0) {
        ball2SpeedY = -ball2SpeedY;
    }

    context.fillStyle = "black";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.fillStyle = "lightblue";
    
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, 2*Math.PI);
    context.closePath();
    context.fill();
    
    context.fillStyle = "pink";
    context.beginPath();
    context.arc(ball2X, ball2Y, ball2Radius, 0, 2*Math.PI);
    context.closePath();
    context.fill();
}

Below is the end character sequence.
*/