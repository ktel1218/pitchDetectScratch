navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
   getUserMedia: function(c) {
     return new Promise(function(y, n) {
       (navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia).call(navigator, c, y, n);
     });
   }
} : null);

if (!navigator.mediaDevices) {
  console.log("getUserMedia() not supported.");
}

// Prefer camera resolution nearest to 1280x720.

var constraints = { audio: true };

navigator.mediaDevices.getUserMedia(constraints)
.then(function(stream) {
    console.log("YAY!");
})
.catch(function(err) {
  console.log(err.name + ": " + err.message);
});