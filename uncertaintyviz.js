"use strict";

function timeviz() {
    var f_show = {}; // Categories to showing
    var f_hide = {}; // Categories to hide

    var categories = "journal|conference|poster|thesis|technicalReport|book|cartography|cognitivePsychology|healthAnalytics|humanFactors|decisionMaking|infoVis|sciVis|cyberSecurity|ubiquitousComputing|statistics|dataScience|aviation|gis|medicalScience|manufacturing|astrophysics|urbanPlanning|management|transport|general|nonExpert|domainExpert|noEvaluation|caseStudy|userStudy|expertReview|survey".split("|");

    var $current_detail_tec;

    // Store frequently used items in vars
    var $detail = $("#detail");
    var $detail_title = $("#detail_title");
    var $detail_categories = $("#detail_categories");
    var $detail_source = $("#detail_source");
    var $detail_abstract = $("#detail_abstract");
    var $detail_keywords = $("#detail_keywords");
    var $detail_cites = $("#detail_cites");
    var $detail_img = $("#detail_img");
    var $detail_load_msg = $("#detail_load_msg");
    var $close_detail = $("#nav_close");
    var $nav_prev = $("#nav_prev");
    var $nav_next = $("#nav_next");
    var $count = $("#count");
    var $tooltip = $("#tooltip");
    var $search = $("#search");
    var $clear_search = $("#clear_search");
    var $thumbs = $("#thumbs");
    var $tecs = $thumbs.find(".tec");
    var $imgs = $tecs.children("img");
    var $view_full = $("#nav_full");
    var $window = $(window);

    function categoryclick() {
        var cat = this.id.substr(4, this.id.indexOf('_', 4) - 4); // Filter category
        var what = this.id.substr(this.id.indexOf('_', 4) + 1); // What to do with category: want, neutral, or hide

        if (what == 'want') {
            f_show[cat] = true;
            delete f_hide[cat];
        }
        else if (what == 'hide') {
            f_hide[cat] = true;
            delete f_show[cat];
        }
        else { // 'neutral'
            delete f_show[cat];
            delete f_hide[cat];
        }

        toURL();

        doFilter();
    }

    $('input[id^="swi_"]').each(function () { // Attach click handlers to switches 'swi_<category>_<operation>'
        $(this).click(categoryclick);
    });

    function toURL() {
        // For all categories in f_show and f_hide...
        var url = [].concat(Object.keys(f_show), Object.keys(f_hide)).map(function (o) {
            return o + (f_show[o] ? "=1" : "=0"); // ...attach <category>=1 for want (0 for hide)
        }).join("&"); // Join everything with &

        if ($current_detail_tec) {
            if (url) url += "&";
            url += "goto=" + $current_detail_tec.attr("data-id").replace(/ /g, "%20");
        }

        if (window.location.search.substr(1) != url) {
            window.history.pushState({}, "", "?" + url);
        }
    }

    function fromURL() {
        // Remove leading ? and split at &
        var params = window.location.search.substring(1).split("&").reduce(function (o, p) {
            var kv = p.split("="); // Split into key-value
            if (kv.length == 2) o[kv[0]] = kv[1];
            return o;
        }, {});

        f_show = {};
        f_hide = {};

        categories.forEach(function (cat) {
            $("#swi_" + cat + "_neutral").prop("checked", true);

            if (params[cat] == 1) {
                f_show[cat] = true;
                $("#swi_" + cat + "_want").prop("checked", true);
            }
            else if (params[cat] == 0) {
                f_hide[cat] = true;
                $("#swi_" + cat + "_hide").prop("checked", true);
            }
        });

        doFilter();

        if (params["goto"]) {
            var filter = '[data-id="' + params["goto"].replace(/%20/g, " ") + '"]';
            var $tec = $tecs.filter(filter);
            openDetail($tec);
        }
        else {
            closeDetail();
        }
    }

    $window.on('popstate', fromURL);

    $window.scroll(function (e) { // Keep detail centered when scrolling
        if ($detail.is(":visible")) {
            centerDetail();
        }
    });

    $window.resize(function (e) { // Keep detail centered when resizing
        if ($detail.is(":visible")) {
            centerDetail();
        }
        doLayout();
    });

    $count.text($tecs.length);

    $imgs.mouseenter(function (e) { // Highlight thumb and update tooltip when mouse enters
        $(this).addClass("highlighted");
        $tooltip.text($(this).parent().attr("data-id")).show();
    });

    $imgs.mouseleave(function (e) { // Back to normal when mouse leaves
        $(this).removeClass("highlighted");
        $tooltip.hide();
    });

    $imgs.mousemove(function (e) { // Adjust tooltip position according to mouse pointer
        $tooltip.offset({left: e.pageX + 12, top: e.pageY + 12});
    });

    $imgs.click(function (e) { // Open detail view when techniques is clicked
        timeviz.goto($(this).parent().attr("data-id"));
    });

    $detail_img.load(function (e) { // Fade in the detail image and hide the loading message when detail image has been loaded
        $detail_load_msg.hide();
        $(this).fadeIn("slow");
    });

    $close_detail.click(function (e) { // Hide the detail view and clear its image
        timeviz.goto(undefined);
    });

    $view_full.click(function (e) { // Open a new window with the "full" image
        window.open($detail_img.attr("src").replace("previews", "full"));
    });

    $clear_search.click(function (e) { // Remove text from search box and re-run the filter
        $search.val('');
        doFilter();
    });

    $search.keyup(function (e) { // Run the filter on key release
        doFilter();
    });

    $search.change(function (e) { // Run the filter on changes in the search text box
        doFilter();
    });

    $nav_prev.click(function (e) { // Navigate to the previous "visible" technique
        var $prev = $current_detail_tec.prevAll('.visible');
        if ($prev.length == 0) {
            $prev = $tecs.last();
            if (!$prev.is('.visible')) {
                $prev = $prev.prevAll('.visible');
            }
        }

        if ($prev.length != 0) {
            timeviz.goto($($prev[0]).attr("data-id"));
        }
        else {
            timeviz.goto(undefined);
        }
    });

    $nav_next.click(function (e) { // Navigate to the next "visible" technique
        var $next = $current_detail_tec.nextAll('.visible');
        if ($next.length == 0) {
            $next = $tecs.first();
            if (!$next.is('.visible')) {
                $next = $next.nextAll('.visible');
            }
        }

        if ($next.length != 0) {
            timeviz.goto($($next[0]).attr("data-id"));
        }
        else {
            timeviz.goto(undefined);
        }
    });

    timeviz.goto = function (id) {
        if (id) {
            openDetail($tecs.filter('[data-id="' + id + '"]'));
        }
        else {
            closeDetail();
        }

        toURL();
    };

    function closeDetail() {
        $current_detail_tec = undefined;
        $detail.hide();
        $detail_img.attr("src", "");
    }

    function openDetail($tec) {
        $current_detail_tec = $tec;

        $detail_title.text($tec.attr("data-id")); // Set the title of the detail to "data-id"
        $detail_source.html($tec.children(".tec-source").text()); // Set the source information
        $detail_abstract.html($tec.children(".tec-abstract").html()); // Set the abstract info of the detail
        $detail_keywords.html($tec.children(".tec-keywords").html()); // Set the keywords of the detail

        // Add category icons to detail
        var cats = $tec.attr("data-categories").split('|'); // Split categories into an array
        var icos = "";
        for (var c = 0; c < cats.length; c++) {
            icos += '<div class="c-icon c-' + cats[c] + '"></div>';
        }
        $detail_categories.html(icos);

        $detail_cites.empty();  // Add references to detail
        var refs = "";
        $tec.children(".tec-citation").each(function () {
            refs += ('<li>' + $(this).html() + '</li>');
        });
        $detail_cites.html(refs);

        $detail_load_msg.show(); // Show the loading message

        centerDetail(); // Center the detail
        $detail.show(); // Show the detail

        var src = $tec.children("img").attr("src").replace("thumbs", "previews"); // New img src is "src" attribute of the clicked thumb

        $detail_img.attr("src", src); // Set new detail image source
    }

    function centerDetail() {
        var x = $window.scrollLeft() + ($window.width() - $detail.width()) / 2; // Compute coordinates for centering the detail
        var y = $window.scrollTop() + ($window.height() - $detail.height()) / 2;
        $detail.css({"left": x + "px", "top": y + "px"}); // Set position of detail
    }

    function doLayout() {
        var left = 0;
        var top = 0;
        var size = 126;
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        var tw = $thumbs.innerWidth();
        var last_row_empty = true;
        $tecs.each(function () {
            if ($(this).is(".visible")) {
                last_row_empty = false;
                $(this).css({left: left, top: top});
                left += size;
                if (left + size > tw) {
                    top += size;
                    left = 0;
                    last_row_empty = true;
                }
            }
            else {
                $(this).css({left: ww + 200 + Math.random()*100, top: Math.random()*wh});
            }
        });
        $thumbs.css({height: top + ((last_row_empty) ? 0 : size)});
    }

    function doFilter() {
        var total = 0; // Count total number of techniques
        var visible = 0; // Count number of visible techniques
        var search = $search.val().toLowerCase(); // The search string

        $tecs.each(function () { // Filter each technique separately
            total += 1;

            var cats = $(this).attr("data-categories").split('|'); // Split categories into an array

            // Search for techniqes according to search string
            var isSearched = true;
            if (search.length > 0) { // If the search string has content
                var match = false;
                match = match || ( $(this).attr("data-id").toLowerCase().indexOf(search) >= 0 ); // Search in the id
                match = match || ( $(this).attr("data-categories").toLowerCase().indexOf(search) >= 0 ); // Search in the categories
                match = match || ( $(this).children(".tec-abstract").text().toLowerCase().indexOf(search) >= 0 ); // Search in the main text
                match = match || ( $(this).children(".tec-citation").text().toLowerCase().indexOf(search) >= 0 ); // Search in the references
                isSearched = match;
            }

            // Search for wanted techniques
            var isWanted = true;
            var want = Object.keys(f_show);
            for (var w = 0; w < want.length; w++) { // Check if technique has all wanted categories
                if (cats.indexOf(want[w]) < 0) {
                    isWanted = false;
                    break;
                }
            }

            // Check if techniques is marked for hiding
            var isFiltered = false;
            var i = cats.length;
            while (i--) {
                if (f_hide[cats[i]]) {
                    isFiltered = true;
                    break;
                }
            }

            if (isFiltered || !isWanted || !isSearched) { // Hide the technique
                $(this).removeClass("visible");
            }
            else { // Show the technique
                $(this).addClass("visible");
                visible++;
            }
        });

        if (visible == total) { // Update the technique counter
            $count.text(total);
        }
        else {
            $count.text(visible + "/" + total);
        }

        doLayout();
    }

    fromURL();
}
