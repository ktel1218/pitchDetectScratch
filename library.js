var pitchDetect = function (){

    var audioContext = new AudioContext();
    var analyser;
    var mediaStreamSource;

    var buflen = 1024;
    var buf = new Float32Array( buflen );


    var MIN_SAMPLES = 0; 

    var success;


    // getUserMedia Polyfill
    navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
       getUserMedia: function(constraints) {
         return new Promise(function(resolve, reject) {
           (navigator.mozGetUserMedia ||
            navigator.webkitGetUserMedia).call(navigator, constraints, resolve, reject);
         });
       }
    } : null);

    function requestMicrophone () {
        // success = navigator.mediaDevices ? true : false;
        var userMediaPromise;
        if (navigator.mediaDevices) {
            var constraints = { 
                "audio": { 
                    "mandatory": {
                        "googEchoCancellation": "false",
                        "googAutoGainControl": "false",
                        "googNoiseSuppression": "false",
                        "googHighpassFilter": "false"
                    },
                    "optional": []
                }
            };

            userMediaPromise = navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream) {
                // Create an AudioNode from the stream.
                mediaStreamSource = audioContext.createMediaStreamSource(stream);

                // Connect it to the destination.
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                mediaStreamSource.connect( analyser );

            }).catch(function(err) {
                console.log(err.name + ": " + err.message);
            });
        }
        return userMediaPromise
    }


    function autoCorrelate( buf, sampleRate ) {
        var SIZE = buf.length;
        var MAX_SAMPLES = Math.floor(SIZE/2);
        var best_offset = -1;
        var best_correlation = 0;
        var rms = 0;
        var foundGoodCorrelation = false;
        var correlations = new Array(MAX_SAMPLES);

        for (var i=0;i<SIZE;i++) {
            var val = buf[i];
            rms += val*val;
        }
        rms = Math.sqrt(rms/SIZE);
        if (rms<0.01) // not enough signal
            return -1;

        var lastCorrelation=1;
        for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
            var correlation = 0;

            for (var i=0; i<MAX_SAMPLES; i++) {
                correlation += Math.abs((buf[i])-(buf[i+offset]));
            }
            correlation = 1 - (correlation/MAX_SAMPLES);
            correlations[offset] = correlation; // store it, for the tweaking we need to do below.
            if ((correlation>0.9) && (correlation > lastCorrelation)) {
                foundGoodCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            } else if (foundGoodCorrelation) {
                // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
                // Now we need to tweak the offset - by interpolating between the values to the left and right of the
                // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
                // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
                // (anti-aliased) offset.

                // we know best_offset >=1, 
                // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
                // we can't drop into this clause until the following pass (else if).
                var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
                return sampleRate/(best_offset+(8*shift));
            }
            lastCorrelation = correlation;
        }
        if (best_correlation > 0.01) {
            // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
            return sampleRate/best_offset;
        }
        return -1;
    //  var best_frequency = sampleRate/best_offset;
    }

    function updatePitch() {
        analyser.getFloatTimeDomainData( buf );
        var ac = autoCorrelate( buf, audioContext.sampleRate );
        var pitch;
        // var noteString;
        if (ac == -1) {
            pitch = null;

        } else {
        //     detectorElem.className = "confident";
            pitch = ac;
        //     pitchElem.innerText = Math.round( pitch ) ;
        //     var note =  noteFromPitch( pitch );
            // noteString = noteStrings[note%12];
        //     noteElem.innerHTML = noteStrings[note%12];
            // var detune = centsOffFromPitch( pitch, note );
            // if (detune == 0 ) {
        //         detuneElem.className = "";
        //         detuneAmount.innerHTML = "--";
            // } else {
        //         if (detune < 0)
        //             detuneElem.className = "flat";
        //         else
        //             detuneElem.className = "sharp";
        //         detuneAmount.innerHTML = Math.abs( detune );
        //     }
        }
        return pitch
    }

    return {

        success: success,
        requestMicrophone: requestMicrophone,
        updatePitch: updatePitch,

    }
}();