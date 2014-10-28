(function(){
	'use strict';

	var app;

	app = angular.module('app', []);

	app.directive('please-wait-modal', function(){

		return{
			restrict: 'E',
			scope:{
				show:'=',
				title:'@'
			},
			link: function(scope, element, attrs){
				
			}
		}


	});


}).call(this);


angular.module('PleaseWaitModal', []).value('myWaveSurferConfig', {}).directive('myWaveSurfer', ['myWaveSurferConfig', 'UtilsFactory', 'WaveSurferFactory',
    function(myWaveSurferConfig, UtilsFactory, WaveSurferFactory) {
        var maxZoom = 100;
        var minZoom = 14;
        var zoomGap = 2;
        var timeline;
        // Set some default options
        var options = {
            waveColor: 'lightgrey',
            progressColor: 'black',
            loaderColor: 'purple',
            cursorColor: 'navy',
            markerWidth: 2,
            minPxPerSec: minZoom,
            selectionColor: 'rgba(255,0,0, .2)',
            selectionForeground: true,
            selectionBorderColor: '#d42929',
            selectionBorder: false,
            interact: true,
            loopSelection: false,
            dragSelection: false,
            scrollParent: true
        };
        myWaveSurferConfig = myWaveSurferConfig || {};
        // Merge default config with user config
        angular.extend(options, myWaveSurferConfig);
        return {
            restrict: "A",
            scope: {
                myFile: '=file',
                waveSurfer: '=instance'
            }, // isolated scope
            link: function($scope, el, attrs) {
                $scope.$emit('wsLoading');
                $scope.playMode = 'normal';
                $scope.loop = false;
                $scope.currentMarker;
                var $container = document.querySelector('#waveform');
                options.container = $container;
                // Wavesurfer Progress bar
                var progressDiv = document.querySelector('#progress-bar');
                var progressBar = progressDiv.querySelector('.progress-bar');
                if (!$scope.waveSurfer) {
                    $scope.waveSurfer = Object.create(WaveSurfer);
                    $scope.waveSurfer.init(options);
                } else {
                    if ($scope.waveSurfer.markers) $scope.waveSurfer.clearMarks();
                }
                $scope.waveSurfer.load($scope.myFile.url);
                $scope.waveSurfer.on('loading', function(percent, xhr) {
                    progressDiv.style.display = 'block';
                    progressBar.style.width = percent + '%';
                });
                // Won't work on iOS until you touch the page
                $scope.waveSurfer.on('ready', function() {
                    progressDiv.style.display = 'none';
                    // TIMELINE
                    // avoid creating timeline object twice (after uploading a new file for example)
                    if (timeline) {
                        $('#wave-timeline wave').remove();
                    } else {
                        // create timeline object
                        timeline = Object.create(WaveSurfer.Timeline);
                    }
                    timeline.init({
                        wavesurfer: $scope.waveSurfer,
                        container: '#wave-timeline'
                    });
                    $scope.time = UtilsFactory.secondsToHms($scope.waveSurfer.backend.getCurrentTime());
                    $scope.$emit('wsLoaded', $scope.waveSurfer);
                });
                // listen to progress event
                $scope.waveSurfer.on('progress', function() {
                    // surround the call with setTimeout to avoid that : https://docs.angularjs.org/error/$rootScope/inprog
                    window.setTimeout(function() {
                        $scope.$apply(function() {
                            $scope.time = UtilsFactory.secondsToHms($scope.waveSurfer.backend.getCurrentTime());
                        });
                    }, 0);
                });
                // listen to this event to stop playing in segment mode
                $scope.waveSurfer.on('mark', function(mark) {
                    if ($scope.playMode === 'segment' && mark.percentage === $scope.selection.endPercentage) {
                        // if loop
                        if ($scope.loop) {
                            $scope.waveSurfer.playPauseSelection();
                        } else if (!$scope.waveSurfer.backend.isPaused()) {
                            // pause playing
                            $scope.playPause();
                        }
                    }
                });
                // handle wavesurfer drawer drag-mark event to update selection if needed
                $scope.waveSurfer.drawer.on('drag-mark', function(drag, marker) {
                    if ($scope.selection && $scope.selection.startPercentage) {
                        // pause if playing
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.waveSurfer.playPause();
                        }
                        $scope.waveSurfer.clearSelection();
                    }
                });
                progressDiv.style.display = 'none';
            },
            templateUrl: 'js/app/wavesurfer/partials/wave.html',
            controller: ['$scope',
                function($scope) {
                    // 'public' methods (callable from wiew)
                    // play / pause method
                    $scope.playPause = function() {
                        // pause if playing
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.waveSurfer.playPause();
                        } else {
                            $scope.duration = $scope.waveSurfer.backend.getDuration();
                            if ($scope.playMode === 'normal') {
                                if ($scope.loop) {
                                    playNormalLoop($scope.waveSurfer.backend.getCurrentTime());
                                } else {
                                    $scope.waveSurfer.playPause();
                                }
                            } else if ($scope.playMode === 'segment') {
                                var currentTime = $scope.waveSurfer.backend.getCurrentTime();
                                var prevMarker = WaveSurferFactory.getPreviousMarkerForSelection($scope.waveSurfer.markers, currentTime);
                                var start = prevMarker ? prevMarker.position : 0;
                                currentTime += 0.3;
                                var nextMarker = WaveSurferFactory.getNextMarkerForSelection($scope.waveSurfer.markers, currentTime, $scope.duration);
                                var end = nextMarker ? nextMarker.position : $scope.duration;
                                // create a selection
                                $scope.selection = {};
                                $scope.selection.startPercentage = start / $scope.duration;
                                $scope.selection.endPercentage = end / $scope.duration;
                                $scope.waveSurfer.updateSelection($scope.selection);
                                // the loop playing mode is handled by playPauseSelection Wavesurfer method
                                $scope.waveSurfer.playPauseSelection();
                            } else if ($scope.playMode === 'backward') {
                                var prevMarker = WaveSurferFactory.getPreviousMarker($scope.waveSurfer.markers, $scope.duration);
                                if (prevMarker) {
                                    playBackwardBuilding(prevMarker.position, false);
                                } else {
                                    $scope.waveSurfer.seekTo(0);
                                    $scope.waveSurfer.play();
                                }
                            }
                        }
                    };
                    // go to previous marker
                    $scope.back = function() {
                        WaveSurferFactory.moveBackward($scope.waveSurfer);
                    };
                    // go to next marker
                    $scope.forth = function() {
                        WaveSurferFactory.moveForward($scope.waveSurfer);
                    };
                    $scope.zoomIn = function() {
                        var current = $scope.waveSurfer.backend.getCurrentTime();
                        $scope.waveSurfer.params.minPxPerSec += zoomGap;
                        $scope.waveSurfer.minPxPerSec += zoomGap;
                        $scope.waveSurfer.drawBuffer();
                        $scope.waveSurfer.seekAndCenter(current / $scope.waveSurfer.backend.getDuration());
                    };
                    $scope.zoomOut = function() {
                        var current = $scope.waveSurfer.backend.getCurrentTime();
                        $scope.waveSurfer.params.minPxPerSec -= zoomGap;
                        $scope.waveSurfer.minPxPerSec -= zoomGap;
                        $scope.waveSurfer.drawBuffer();
                        $scope.waveSurfer.seekAndCenter(current / $scope.waveSurfer.backend.getDuration());
                    };
                    $scope.changeSpeed = function(e) {
                        var value = e.target.dataset && e.target.dataset.value;
                        if (value) {
                            $scope.waveSurfer.playPause();
                            $scope.waveSurfer.backend.setPlaybackRate(value);
                            $scope.waveSurfer.playPause();
                        }
                    };
                    /**
                     * Change playback mode
                     * We need to handle on the fly (while playing / marker changes...) playing mode switching
                     * @param {Event} e
                     */
                    $scope.togglePlayMode = function(e) {
                        if ($scope.waveSurfer.getSelection()) {
                            $scope.waveSurfer.clearSelection();
                        }
                        $scope.waveSurfer.un('finish');
                        // pause playing if necessary
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.waveSurfer.playPause();
                        }
                        var value = e.target.dataset && e.target.dataset.value;
                        if (value) {
                            $scope.playMode = value;
                        } else {
                            // default play mode
                            $scope.playMode = 'normal';
                        }
                        // call play only if currently playing
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.playPause();
                        }
                    };
                    $scope.mark = function() {
                        $scope.waveSurfer.mark({
                            color: 'rgba(255, 0, 0, 1)',
                            id: UtilsFactory.generateUUID(),
                            type: 'teacher',
                            draggable: true
                        });
                    };
                    $scope.toggleLoop = function() {
                        // pause if playing
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.waveSurfer.playPause();
                        }
                        window.setTimeout(function() {
                            $scope.$apply(function() {
                                $scope.loop = !$scope.loop;
                                $scope.waveSurfer.loopSelection = $scope.loop;
                            });
                        }, 0);
                    };
                    // 'private' methods
                    function playBackwardBuilding(currentStart, last) {
                        var prevMarker;
                        // create a selection
                        $scope.selection = {};
                        $scope.selection.startPercentage = currentStart / $scope.duration;
                        $scope.selection.endPercentage = 100;
                        $scope.waveSurfer.updateSelection($scope.selection);
                        if (!$scope.waveSurfer.backend.isPaused()) {
                            $scope.playPause();
                        }
                        // play selection
                        $scope.waveSurfer.playPauseSelection();
                        // when reaching the end
                        $scope.waveSurfer.once('finish', function() {
                            if (!last) {
                                // get new start (previous marker position)
                                prevMarker = WaveSurferFactory.getPreviousMarker($scope.waveSurfer.markers, currentStart);
                                if (prevMarker) {
                                    // recursively call the method with new start
                                    playBackwardBuilding(prevMarker.position, false);
                                } else {
                                    playBackwardBuilding(0, true);
                                }
                            } else {
                                $scope.waveSurfer.clearSelection();
                                if ($scope.loop) {
                                    prevMarker = WaveSurferFactory.getPreviousMarker($scope.waveSurfer.markers, $scope.duration);
                                    if (prevMarker) {
                                        playBackwardBuilding(prevMarker.position, false);
                                    }
                                }
                            }
                        });
                    }
                    // loop the entire file
                    function playNormalLoop(currentStart) {
                        $scope.waveSurfer.play(currentStart, $scope.duration);
                        $scope.waveSurfer.once('finish', function() {
                            if ($scope.loop) playNormalLoop(0);
                            else $scope.waveSurfer.un('finish');
                        });
                    }
                }
            ]
        };
    }
]);