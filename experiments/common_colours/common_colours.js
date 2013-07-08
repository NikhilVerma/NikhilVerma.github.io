// Please don't judge my code quality. I hacked this together while experimenting.

var Utils = {
    toYUV: _.memoize(function(r, g, b) {
        var y = r * 0.299000 + g * 0.587000 + b * 0.114000;
        var u = 0.713 * (r - y);
        var v = 0.564 * (b - u);
        return [y, u, v];
    }, function(r, g, b) {
        return '' + r + g + b;
    }),

    euclidianDistance: function(a, b) {
        return Math.sqrt(Math.pow(a[0] - b[0], 2) * 0.3 + Math.pow(a[1] - b[1], 2) * 0.35 + Math.pow(a[2] - b[2], 2) * 0.35);
    },

    getProminentColors: function(array) {
        var samples = [];
        var len = array.length;
        var i, j, dist;

        // Populate the colors array
        for (i = 0, len = array.length; i < len; i++) {
            samples.push([array[i], 0]);
        }

        // Compare each element in the sample with the other to calculate the distance
        // of that one from the other
        for (i = 0; i < len; i++) {
            for (j = len; j > i; j--) {
                if (samples[i] && samples[j]) {
                    dist = this.euclidianDistance(this.toYUV.apply(this, samples[i][0]), this.toYUV.apply(this, samples[j][0]));

                    // Colors are similar
                    if (dist < 30) {
                        samples[i][1]++;
                        // Empty the other element as it's too similar
                        samples[j] = null;
                    } else if (dist > 150) {
                        // colors are too different, we need to give those priority as well
                        samples[j][1]++;
                    }
                }
            }
        }

        var output = [];
        var sum = 0;

        for (i = 0; i < len; i++) {
            if (samples[i]) {
                output.push(samples[i]);
                sum += samples[i][1];
            }
        }

        output = output.sort(function(a, b) {
            return b[1] - a[1];
        });

        return {
            colors: output,
            sum: sum
        };
    }
};

var CanvasView = (function() {

    var canvas = document.createElement('canvas');

    return {
        el: canvas,

        // We scale the image down to 100px width
        width: 100,

        context: canvas.getContext('2d'),

        getImagePixelsFromSrc: function(src, callback) {
            var img = new Image();

            img.onload = _.bind(function() {
                var width = canvas.width = this.width;
                var height = canvas.height = this.width * img.height / img.width | 0;
                this.context.drawImage(img, 0, 0, width, height);

                var arr = [],
                    data = this.context.getImageData(0, 0, width, height).data;

                for (var i = 0, len = data.length; i < len; i += 4) {
                    arr.push([data[i], data[i + 1], data[i + 2]]);
                }

                callback(arr);
            }, this);

            img.src = src;
        }
    };
})();

var handleFileSelect = function(e) {
    var reader = new FileReader();
    var output = document.getElementById('output');

    reader.onload = function(e) {
        CanvasView.getImagePixelsFromSrc(e.target.result, function(pixels) {
            var colors = Utils.getProminentColors(pixels);

            var str = '';
            for (i = 0, len = colors.colors.length; i < len; i++) {
                str += '<span style="background-color:rgb(' + colors.colors[i][0] + '); width:' + (colors.colors[i][1] / colors.sum * 100) + '%">' + Math.round(colors.colors[i][1] / colors.sum * 100) + '%</span>';
            }

            output.innerHTML = str;
        });
    };

    // Read in the image file as a data URL.
    reader.readAsDataURL(e.target.files[0]);
};

document.getElementById('files').addEventListener('change', handleFileSelect, false);