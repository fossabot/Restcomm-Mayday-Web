// get the canvas element and its context
var canvas = document.getElementById('sketch');
var context = canvas.getContext('2d');


canvas.width = document.getElementById('main_div').clientWidth;
canvas.height = document.getElementById('main_div').clientHeight;
console.log("canvas.width "+ canvas.width + " s width "+  document.getElementById('main_div').clientWidth);
console.log("canvas. height " +canvas.height+ "s height "+ document.getElementById('main_div').clientHeight);
var oWidth = canvas.width;
var oHeight = canvas.height;
var lines = [];
var lastMouse = {
  x: 0,
  y: 0
};

// brush settings
context.lineWidth = 2;
context.lineJoin = 'round';
context.lineCap = 'round';
context.strokeStyle = '#000';



// attach the mousedown, mouseout, mousemove, mouseup event listeners.
canvas.addEventListener('mousedown', function (e) {
  lastMouse = {
    x: e.pageX - this.offsetLeft,
    y: e.pageY - this.offsetTop
  };
  canvas.addEventListener('mousemove', move, false);
}, false);

canvas.addEventListener('mouseout', function () {
  canvas.removeEventListener('mousemove', move, false);
}, false);

canvas.addEventListener('mouseup', function () {
  canvas.removeEventListener('mousemove', move, false);
}, false);

function loadCanvas(){
	canvas = document.getElementById("peerBrowser").contentDocument.getElementById('sketch');
	context = canvas.getContext('2d');
}
// Sets the brush size:
function setSize(size) {
  context.lineWidth = size;
}

// Sets the brush color:
function setColor(color) {
  context.globalCompositeOperation = 'source-over';
  context.strokeStyle = color;
}

// Sets the brush to erase-mode:
function eraser() {
  context.globalCompositeOperation = 'destination-out';
  context.strokeStyle = 'rgba(0,0,0,1)';
}

// Clears the canvas and the lines-array:
function clear(send) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  lines = [];
  if (send && TogetherJS.running) {
    TogetherJS.send({
      type: 'clear'
    });
  }
}

// Redraws the lines from the lines-array:
function reDraw(lines){
  for (var i in lines) {
    draw(lines[i][0], lines[i][1], lines[i][2], lines[i][3], lines[i][4], false);
    
  }
}
// Draws the lines, called by move and the TogetherJS event listener:
function draw(start, end, color, size, compositeOperation, save) {
  context.save();
  context.lineJoin = 'round'; 
  context.lineCap = 'round';
  // Since the coordinates have been translated to an 1140x400 canvas, the context needs to be scaled before it can be drawn on:
  context.scale(canvas.width/1140,canvas.height/400);
  context.strokeStyle = color;
  context.globalCompositeOperation = compositeOperation;
  context.lineWidth = size;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.closePath();
  context.stroke();
  context.restore();
  if (save) {
    // Won't save if draw() is called from reDraw().
    lines.push([{x: start.x, y: start.y}, {x: end.x, y: end.y}, color, size, compositeOperation]);
  }
}

// Called whenever the mousemove event is fired, calls the draw function:
function move(e) {
  var mouse = {
    x: e.pageX - this.offsetLeft,
    y: e.pageY - this.offsetTop
  };
  // Translates the coordinates from the local canvas size to 1140x400:
  sendMouse = {
    x: (1140/canvas.width)*mouse.x,
    y: (400/canvas.height)*mouse.y
  };
  sendLastMouse = {
    x: (1140/canvas.width)*lastMouse.x,
    y: (400/canvas.height)*lastMouse.y
  };
  draw(sendLastMouse, sendMouse, context.strokeStyle, context.lineWidth, context.globalCompositeOperation, true);
 
  if (TogetherJS.running) {
    TogetherJS.send({
      type: 'draw',
      start: sendLastMouse,
      end: sendMouse,
      color: context.strokeStyle,
      size: context.lineWidth,
      compositeOperation: context.globalCompositeOperation
    });
  }
  lastMouse = mouse;
}

// Listens for draw messages, sends info about the drawn lines:
TogetherJS.hub.on('draw', function (msg) {
  if (!msg.sameUrl) {
      return;
  }
  draw(msg.start, msg.end, msg.color, msg.size, msg.compositeOperation, true);
});


// Clears the canvas whenever someone presses the clear-button
TogetherJS.hub.on('clear', function (msg) {
  if (!msg.sameUrl) {
    return;
  }
  clear(false);
});

// Hello is sent from every newly connected user, this way they will receive what has already been drawn:
TogetherJS.hub.on('togetherjs.hello', function () {
  TogetherJS.send({
    type: 'init',
    lines: lines
  });
});

// Draw initially received drawings:
TogetherJS.hub.on('init', function (msg) {
  //reDraw(msg.lines);
  lines = msg.lines;
});
// JQuery to handle buttons and resizing events, also changes the cursor to a dot resembling the brush size:
$(document).ready(function () {
  // changeMouse creates a temporary invisible canvas that shows the cursor, which is then set as the cursor through css:
  function changeMouse() {
    // Makes sure the cursorSize is scaled:
    var cursorSize = context.lineWidth*(canvas.width/1140); 
    if (cursorSize < 10){
        cursorSize = 10;
    }
    var cursorColor = context.strokeStyle;
    var cursorGenerator = document.createElement('canvas');
    cursorGenerator.width = cursorSize;
    cursorGenerator.height = cursorSize;
    var ctx = cursorGenerator.getContext('2d');

    var centerX = cursorGenerator.width/2;
    var centerY = cursorGenerator.height/2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, (cursorSize/2)-4, 0, 2 * Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = cursorColor;
    ctx.stroke();
  }
  // Init mouse
  changeMouse();
  // Redraws the lines whenever the canvas is resized:
  $(window).resize(function() {
    if ($('#sketchContainer').width() != oWidth) {
      var ratio = canvas.width/oWidth;
      oWidth = canvas.width;
      oHeight = canvas.height;
      //reDraw(lines);
      changeMouse();
    }
  });

  // Clears the canvas:
  $('.clear').click(function () {
    clear(true);
  });

  // Color-button functions:
  $('.color-picker').click(function () {
    var $this = $(this);
    console.log($this);
    setColor($this.css("background-color"));
    changeMouse();
  });

  $('.eraser').click(function () {
    eraser();
    changeMouse();
  });
  // TogetherJS user color:
  $('.user-color-pick').click(function() {
    setColor(TogetherJS.require('peers').Self.color);
    changeMouse();
  });

  // Increase/decrease brush size:
  $('.plus-size').click(function() {
    setSize(context.lineWidth+3);
    changeMouse();
  });

  $('.minus-size').click(function() {
    if (context.lineWidth > 3) {
      setSize(context.lineWidth-3);
    }
    changeMouse();
  });    
});