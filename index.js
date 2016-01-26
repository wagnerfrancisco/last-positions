const init = function(map) {
    'use strict';

    const getCurrentPosition = function() {
        return new Promise(function(resolve, reject) {
            const geolocation = navigator.geolocation;

            geolocation.getCurrentPosition(function(position) {
                const coords = position.coords;
                resolve({
                    lat: coords.latitude,
                    lng: coords.longitude
                });
            });
        });
    };

    const sendPosition = function(position) {
        return new Promise(function(resolve, reject) {
            const req = new XMLHttpRequest();

            req.onreadystatechange = function() {
                if (this.readyState === 4) {
                    try {
                        resolve(JSON.parse(this.responseText));
                    } catch (e) {
                        reject(e);
                    }
                }
            };

            req.open('POST', 'positions', true);
            req.setRequestHeader('content-type', 'application/json');
            req.send(JSON.stringify(position));
        });
    };

    const updatePositions = (function() {
        let markers = [];

        const clearAll = function() {
            console.log(markers.length);
            markers.forEach(function(marker) {
                marker.setMap(null);
            });
        };

        const center = function(positions) {
            const len = positions.length;

            if (len > 0) {
                map.panTo(positions[len-1]);
            }
        };

        return function(positions) {
            clearAll();

            markers = positions.map(function(position) {
                return new google.maps.Marker({
                    position,
                    map
                });
            });

            center(positions);
        };
    }());

    const syncPosition = function() {
        getCurrentPosition()
            .then(sendPosition)
            .then(updatePositions)
            .then(function() {
                setTimeout(syncPosition, 30000);
            });
    };

    if ('geolocation' in navigator) {
        syncPosition();
    }
};

window.initMap = function() {
    'use strict';

    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -27.6002358, lng: -48.5126318 },
        scrollwheel: false,
        zoom: 18
    });

    init(map);
};
