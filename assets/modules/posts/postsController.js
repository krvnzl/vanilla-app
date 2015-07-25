/*
 * Controller retrieves all post types from CMS:
 * (1) Pic+Text posts (author: @UnboxedTherapy)
 * (2) Pic+Text posts (author: Samsung Mobile)
 * (3) Text-only posts (author: @UnboxedTherapy)
 * (4) Text-only posts (author: Samsung Mobile)
 * (5) Twitter posts
 *
 * Controller compiles combined post list with each
 * post referencing its corresponding post template
 *
 */

 ;"use strict";

angular.module('eko.directives', [])
.directive("fillBackgroundImgs", function() {

	return function(scope, element, attrs) {
		attrs.$observe('fillBackgroundImg', function(value) {
			element.css({
					'background-image': 'url(static/images/' + value + ')'
				});
			element.addClass('fill-background-img');
		});
	};

})