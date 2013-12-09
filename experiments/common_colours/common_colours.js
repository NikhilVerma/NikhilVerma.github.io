/**
 * Utility methods
 * @type {Object}
 */
var Utils = {

    /**
     * Converts RGB to YUV color.
     * @param  {Number} r
     * @param  {Number} g
     * @param  {Number} b
     * @return {Array}
     */
    toYUV: function (r, g, b) {
        var y = r * 0.299000 + g * 0.587000 + b * 0.114000;
        var u = 0.565 * (b - y);
        var v = 0.713 * (r - y);
        return [y, u, v];
    },

    /**
     * Converts YUV to RGB color.
     * @param  {Number} r
     * @param  {Number} g
     * @param  {Number} b
     * @return {Array}
     */
    toRGB: function (y, u, v) {
        var r = Math.round(y + 1.40 * v);
        var g = Math.round(y - 0.344 * u - 0.714 * v);
        var b = Math.round(y + 1.770 * u);

        return [r, g, b];
    },

    /**
     * Euclidian distance between two color sets
     * @param  {Array} a an array with 3 num children
     * @param  {Array} b an array with 3 num children
     * @return {Number}   distance between the two colors
     */
    euclidianDistance: function (a, b) {
        return Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2);
    },

    /**
     * Returns an array containing the common colors from an array of colours. It uses euclidian distance
     * to find out colors which are close to each other. While also giving some importance to the colors
     * which are too different from one another.
     * @param  {Array} array Array of colors
     * @return {Array}       Array of common colors
     */
    getProminentColors: function (array) {
        var samples = [];
        var len = array.length;
        var i, j, dist;

        // Populate the colors array
        // 1 is the weight given to a color
        for (i = 0, len = array.length; i < len; i++) {
            samples.push([array[i], 1]);
        }

        // Compare each element in the sample with the other to calculate the distance
        // of that one from the other
        for (i = 0; i < len; i++) {
            for (j = len; j > i; j--) {
                if (samples[i] && samples[j]) {

                    dist = this.euclidianDistance(samples[i][0], samples[j][0]);

                    // Colors are similar, eat and kill the other one adding it's weight
                    if (dist < 500) {
                        samples[i][1] += samples[j][1];
                        samples[j] = null;
                    }
                    // colors are too different, we need to give those priority as well
                    else if (dist > 6000) {
                        samples[j][1] += 1;
                    }
                }
            }
        }

        // Sort and sum the output
        var output = [];
        var sum = 0;

        for (i = 0; i < len; i++) {
            if (samples[i]) {
                output.push(samples[i]);
                sum += samples[i][1];
            }
        }

        output = output.sort(function (a, b) {
            return b[1] - a[1];
        });

        return {
            colors: output,
            sum: sum
        };
    },

    /**
     * Returns pixels from a source image using canvas. The input image is scaled
     * down to prevent huge processing times
     * @return {Array} array of YUV colors
     */
    getPixelsFromSrc: (function () {

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var cb = _.indentity;

        /**
         * We scale the image down to 20x width
         * @type {Number}
         */
        var TARGET_WIDTH = 20;

        /**
         * Number of steps to take when scaling the image
         * @type {Number}
         */
        var SCALE_STEPS = 10;

        var img = new Image();
        img.onload = function () {
            var width = canvas.width = img.width;
            var height = canvas.height = img.height;
            var i, len;
            var currW = width;
            var currH = height;
            var lastW, lastH;
            var step = (width - TARGET_WIDTH) / SCALE_STEPS;
            var ratio = width / height;
            var arr = [];

            ctx.drawImage(img, 0, 0, width, height);

            for (i = 1; i <= SCALE_STEPS; i++) {
                lastW = width - i * step;
                lastH = lastW / ratio;
                ctx.drawImage(canvas, 0, 0, currW, currH, 0, 0, lastW, lastH);
                currW = lastW;
                currH = lastH;
            }

            var data = ctx.getImageData(0, 0, currW, currH).data;

            for (i = 0, len = data.length; i < len; i += 4) {
                arr.push(Utils.toYUV(data[i], data[i + 1], data[i + 2]));
            }

            cb(arr);
        };

        return function (src, callback) {
            cb = callback;
            img.src = src;
        };
    })()
};

var handleFileSelect = function (e) {
    var reader = new FileReader();
    var output = document.getElementById('output');

    reader.onload = function (e) {
        Utils.getPixelsFromSrc(e.target.result, function (pixels) {

            var colors = Utils.getProminentColors(pixels);
            var i, len, width;
            var str = '';

            for (i = 0, len = colors.colors.length; i < len; i++) {
                width = colors.colors[i][1] / colors.sum * 100;
                str += '<span style="background-color:rgb(' + Utils.toRGB.apply(this, colors.colors[i][0]) + '); width:' + width + '%"><strong>' + Math.round(width) + '%</strong></span>';
            }

            output.innerHTML = str;
        });
    };

    // Read in the image file as a data URL.
    reader.readAsDataURL(e.target.files[0]);
};

document.getElementById('files').addEventListener('change', handleFileSelect, false);