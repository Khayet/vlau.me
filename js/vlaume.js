function recordFilter(jsonFile, containerName, inputID) {
    // Some names that are repeatedly used as HTML class or ID names
    var listName = 'record-list';
    var itemName = 'record';
    var linkName = itemName + '__link';
    var activeLinkName = linkName + '--active';

    // Get the JSON data by using a XML http request
    var listData;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', jsonFile, false);
    xhr.onload = function(e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                listData = JSON.parse(xhr.responseText);
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.onerror = function(e) {
        console.error(xhr.statusText);
    };
    xhr.send(null);



    /**
     * Before the record list can be build, the DOM has to be loaded so we can hook into the input.
     */
    window.onload = function(e) {
        // Some things that are only usable when JavaScript is enabled are hidden by default.
        // Removing the `js-disabled` class makes them visible again.
        if (document.body.classList.contains('js-disabled')) {
            document.body.classList.remove('js-disabled');
        }

        var placeholderKeys = [];
        for (var key in listData) {
            var value = listData[key];
            placeholderKeys = placeholderKeys.concat(value.title, value.abbr, value.keywords);
        }

        var filterInput = document.getElementById(inputID);
        filterInput.placeholder = placeholderKeys[Math.floor(Math.random() * placeholderKeys.length)];

        if (filterInput.value.length > 0) {
            buildRecordList(filterKeys(filterInput.value));
        }

        var recordList = document.getElementById(listName);
        setActiveClass(recordList.firstElementChild.getElementsByClassName(linkName)[0]);

        // Watch the search field for input changes …
        filterInput.addEventListener('input', function(e) {
            // … and build a new record list according to the filter value
            buildRecordList(filterKeys(filterInput.value));
        }, false);

        document.addEventListener('focus', function(e) {
            if (document.activeElement) {
                setActiveClass(document.activeElement);
            }
        }, true);
    };



    /**
     * Listen to various key presses to enable arrow key navigation over the record links.
     * Opening links is done by giving links focus which has the desired interaction by default
     *
     * Some keys and which keycodes they’re mapped to:
     * `tab` – 9;   `enter` – 13;   `←` – 37;   `↑` – 38;   `→` – 39;   `↓` – 40;
     */
    window.onkeydown = function(e) {
        e = e || window.event;

        var recordList = document.getElementById(listName);

        // If `e.keyCode` is not in the array, abort mission right away
        if ([9, 13, 37, 38, 39, 40].indexOf(e.keyCode) === -1 || !recordList.hasChildNodes()) {
            return;
        }

        var activeLink = recordList.getElementsByClassName(activeLinkName)[0];

        if (e.keyCode === 13) {
            if (document.activeElement === document.getElementById(inputID)) {
                document.activeElement.blur();
                activeLink.focus();
            } else {
                return;
            }
        }

        var targetElement;

        if (e.keyCode === 9) {
            // If there is only one item, the default is fine.
            if (recordList.length === 1) {
                return;
            }

            var elements = focusableElements();
            var activeElement = document.activeElement;

            // Determine which element is the one that will receive focus
            for (var el = 0; el < elements.length; el++) {
                if (elements[el] === activeElement) {
                    if (e.shiftKey && elements[el-1]) {
                        targetElement = elements[el-1];
                    } else if (elements[el+1]) {
                        targetElement = elements[el+1];
                    }
                    break;
                }
            }
        }

        if ([37, 39].indexOf(e.keyCode) > -1) {
            var previousLink;
            var nextLink;
            var linkElements = recordList.getElementsByClassName(linkName);
            for (var i = 0; i < linkElements.length; i++) {
                if (activeLink === linkElements[i]) {
                    previousLink = linkElements[i-1];
                    nextLink = linkElements[i+1];
                    break;
                }
            }

            if (!previousLink && !nextLink) {
                return;
            }

            if (e.keyCode === 37 && previousLink) {
                targetElement = previousLink;
            } else if (e.keyCode === 39 && nextLink) {
                targetElement = nextLink;
            }
        } else if ([38, 40].indexOf(e.keyCode) > -1) {
            var activeItem = findAncestor(activeLink, itemName);
            var previousItem = activeItem.previousElementSibling;
            var nextItem = activeItem.nextElementSibling;

            if (!previousItem && !nextItem) {
                return;
            }

            if (e.keyCode === 38 && previousItem) {
                targetElement = previousItem.getElementsByClassName(linkName)[0];
            } else if (e.keyCode === 40 && nextItem) {
                targetElement = nextItem.getElementsByClassName(linkName)[0];
            }

        }

        if (targetElement && targetElement.classList.contains(linkName)) {
            if ([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
                e.preventDefault();
                targetElement.focus();
            }
            activeLink.classList.remove(activeLinkName);
            targetElement.className += '  ' + activeLinkName;
        }
    };



    /**
     * Takes a string to search for in `listData` to create an array of related keys.
     * @return  An array consisting of key strings which are related to `str`.
     */
    function filterKeys(str) {
        if (str.length === 0) {
            var allKeys = [];
            for (var key in listData) {
                allKeys.push(key);
            }
            return allKeys;
        }

        var recordObjects = [];
        for (var objectKey in listData) {
            recordObjects.push(listData[objectKey]);
        }
        var options = {
            keys: ['abbr', 'title', 'keywords', 'persons', 'links.title'],
            id: 'key'
        };
        var fuse = new Fuse(recordObjects, options);
        return fuse.search(str);
    }



    /**
     * Build the record list containing elements belonging to keys in `relatedKeys`.
     */
    function buildRecordList(relatedKeys) {
        // Check if a list was build previously …
        var recordList = document.getElementById(listName);
        if (recordList) {
            // … and remove its content
            recordList.innerHTML = '';
        } else {
            // … otherwise, create it
            recordList = document.createElement('ul');
            recordList.id = recordList.className = listName;
            document.getElementById(containerName).insertBefore(recordList, null);
        }

        for (var i = 0; i < relatedKeys.length; i++) {
            recordList.innerHTML += recordStr(relatedKeys[i], listData[relatedKeys[i]]);
        }

        // If no list items were inserted, we need to stop here
        if (!recordList.hasChildNodes()) {
            return;
        }

        // Set the first child element in the list to active state
        setActiveClass(recordList.firstElementChild.getElementsByClassName(linkName)[0]);
    }



    /**
     * @return  a string that contains the HTML markup for a record
     */
    function recordStr(key, value) {
        var str = '<li class="' + itemName + '" data-key="' + value.key + '">' +
            '<div class="' + itemName + '__title">' + value.title + '</div>';

        if (value.links.length > 0) {
            str += '<nav class="nav  record-nav">';
            for (var i = 0; i < value.links.length; i++) {
                var link = value.links[i];
                str += '<a class="' + itemName + '__link" href="' + link.url + '">' +
                    link.title + '</a>';
            }
        }

        return str;
    }



    /**
     * @brief  Moves the active class to the given element
     */
    function setActiveClass(element) {
        if (element) {
            if (element.className.indexOf(linkName) > -1) {
                var recordList = document.getElementById(listName);
                var activeItem = recordList.getElementsByClassName(activeLinkName)[0];
                if (activeItem) {
                    activeItem.classList.remove(activeLinkName);
                }
                element.className += '  ' + activeLinkName;
            }
        }
    }



    /**
     * @return  the closest ancestor of `element` that has a class `className`
     */
    function findAncestor(element, className) {
        while ((element = element.parentElement) && !element.classList.contains(className));
        return element;
    }



    /**
     * @brief  Iterates over all current DOM elements to create an array of elements that are
     *         focusable (i.e. they’re visible and have a tabIndex greater -1)
     * @return  an array containing all currently focusable elements in the DOM
     */
    function focusableElements() {
        var elements = document.getElementsByTagName('*');
        var focusable = [];
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].tabIndex > -1 && elements[i].offsetParent !== null) {
                focusable.push(elements[i]);
            }
        }
        return focusable;
    }
}
