Polymer({
    publish: {
        /**
         * The `format` attribute details http://momentjs.com/docs/#/parsing/string-format/.
         *
         * @attribute format
         * @type string
         */
        format: 'DD MMMM YYYY',
        date: null,
        minDate: null,
        maxDate: null,
        position: "right"
    },
    created: function () {
        this.items = [];
        this.viewItems = [
            "year", "month", "day"
        ];
        this.views = {
            Days: {
                item: 'day',
                heading: 'month'
            },
            Months: {
                item: 'month',
                heading: 'year'
            },
            Years: {
                item: 'year',
                heading: 'years'
            }
        };
        this.updateNowDate = this.debounce(this._updateNowDate, 1000);
    },
    ready: function () {
        if (this.date != null && this.date != "") {
            this.now = (this.date) ? this._processDate(this.date) : null;
            this.view = 'Days';
            this.updateDate();
            this.updateItem();
            this.updateInputDate();
        } else {
            this.now = moment();
            this.view = 'Days';
            this.updateDate();
        }
        this.positionChanged();
    },
    positionChanged: function () {
        this.$.calendar.classList.remove("left");
        this.$.calendar.classList.remove("right");
        this.$.calendar.classList.remove("top");
        this.$.calendar.classList.remove("bottom");
        var cl = this.position.split(/ /g);
        for (var i in cl) {
            if(cl[i] != null && cl[i].length>0) {
                this.$.calendar.classList.add(cl[i]);
            }
        }
    },
    goToday: function () {
        this.now = moment();
        this.view = 'Days';
        this.updateDate();
    },
    undo: function () {
        this.now = this.savedDate;
        this.date = this.now;
        this.$.calendar.classList.remove("show");
    },
    clear: function () {
        this.now = null;
        this.date = this.now;
        this.updateDate();
        this.updateItem();
        this.$.input.blur();
    },
    done: function () {
        this.$.calendar.classList.remove("show");
    },
    observe: {
        date: 'updateNowDate',
        minDate: 'updateMinDate',
        maxDate: 'updateMaxDate',
        day: 'setNowDate',
        month: 'render',
        year: 'render',
        view: 'render'
    },
    refocus: false,
    refocusInput: function () {
        this.refocus = true;
    },
    open: function () {
        if (this.now == null) {
            this.now = moment();
            this.view = 'Days';
            this.updateDate();
        }
        this.$.calendar.classList.add("show");
    },
    close: function () {
        if (this.refocus) {
            this.refocus = false;
            this.$.input.focus();
        } else {
            this.$.calendar.classList.remove("show");
        }
    },
    prev: function () {
        this.now = this.now.clone().subtract(1, this.views[this.view].heading);
        this.updateDate();
    },
    next: function () {
        this.now = this.now.clone().add(1, this.views[this.view].heading);
        this.updateDate();
    },
    nextViewBy1: function () {
        var keys = Object.keys(this.views),
            view = keys[keys.indexOf(this.view) + 1];
        this.view = view || this.view;
        this.render();
    },
    nextViewBy2: function () {
        var keys = Object.keys(this.views),
            view = keys[keys.indexOf(this.view) + 2];
        this.view = view || this.view;
        this.render();
    },
    prevView: function () {
        var keys = Object.keys(this.views),
            view = keys[keys.indexOf(this.view) - 1];
        this.view = view || this.view;
    },
    setItem: function (e, d, el) {
        if (el.className.indexOf('active') === -1) {
            return;
        }
        var dateElems = el.dataset.value.split(/-/g);

        for (var i in dateElems) {
            this[this.viewItems[i]] = dateElems[i];
        }
        this.setNowDate();
        if (dateElems.length === 3) {
            this.updateInputDate();
            this.$.input.blur();
        }
        this.prevView();
    },

    render: function () {
        this.setNowDate();

        this['set' + this.view]();
        this.header1 = this[this.views[this.view].heading];
        if (this.views[this.view].heading === "month") {
            this.header2 = this["year"]
        } else {
            this.header2 = "";
        }
    },

    _updateNowDate: function () {
        var now = this.date ? this._processDate(this.date) : null;
        if (now == null || !now.isValid()) {
            return;
        }
        this.now = now;
        this.updateDate();
    },
    updateMinDate: function () {
        this.minDate = this._processDate(this.minDate);
    },
    updateMaxDate: function () {
        this.maxDate = this._processDate(this.maxDate);
    },
    _processDate: function (date) {
        var d = null;
        if (date != null) {
            if (typeof date === "string") {
                var pattern = /([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y|q|Q)/g,
                    matches = pattern.exec(date);
                if (matches) {
                    var now = moment().startOf("day");

                    while (matches) {
                        switch (matches[2] || "d") {
                            case "d" :
                            case "D" :
                                now.add(parseInt(matches[1], 10), "d");
                                break;
                            case "w" :
                            case "W" :
                                now.add(parseInt(matches[1], 10), "w");
                                break;
                            case "m" :
                            case "M" :
                                now.add(parseInt(matches[1], 10), "M");
                                break;
                            case "q" :
                            case "Q" :
                                now.add(parseInt(matches[1], 10), "Q");
                                break;
                            case "y":
                            case "Y" :
                                now.add(parseInt(matches[1], 10), "y");
                                break;
                        }
                        matches = pattern.exec(date);
                    }
                    d = now;
                } else {
                    d = moment(date, this.format);
                }
            } else {
                d = date;
            }
        }
        return d;
    },
    updateInputDate: function () {
        if (this.now == null) {
            this.date = null;
        } else {
            this.date = this.now.format(this.format);
        }
    },
    setNowDate: function () {
        var now = moment([this.day, this.month, this.year].join(' '), 'D MMM YYYY');
        if (now.isValid()) {
            this.now = now;
        } else if (this.day > moment(this.month, 'MMM').daysInMonth()) {
            this.day = moment(this.month, 'MMM').daysInMonth();
        }
    },

    debounce: function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            }, wait);
            if (immediate && !timeout) func.apply(context, args);
        };
    },
    updateDate: function () {
        if (this.now == null) {
        } else {
            this.day = this.now.format('D');
            this.month = this.now.format('MMM');
            this.year = this.now.format('YYYY');
        }
    },
    updateItem: function () {
        if (this.now == null) {
            this.item = "";
            return;
        }
        var tempItem = [];
        for (var i in this.viewItems) {
            tempItem.push(this[this.viewItems[i]]);

            if (this.view == this.viewItems[i]) {
                break;
            }
        }
        this.item = tempItem.join("-");
    },
    getDayNames: function () {
        var start = moment().day(0),
            end = moment().day(6),
            days = [];
        moment()
            .range(start, end)
            .by('days', function (moment) {
                days.push({
                    val: moment.format('dd'),
                    label: moment.format('dd'),
                    cl: 'heading'
                });
            });
        return days;
    },
    setDays: function () {
        var start = this.now.clone().startOf('month').day(0);
        var end = this.now.clone().endOf('month').day(6);

        var items = this.items = this.getDayNames();
        var month = this.now.month();
        this.type = 'days';
        var minDate = this.minDate;
        var maxDate = this.maxDate;
        moment()
            .range(start, end)
            .by('days', function (momentParam) {
                var cl = "";
                if ((minDate != null && minDate.isAfter(momentParam)) ||
                    (maxDate != null && maxDate.isBefore(momentParam))) {
                    cl = "fade";
                } else if (momentParam.month() === month) {
                    cl = 'active';
                } else {
                    cl = 'active fade';
                }
                if (moment().startOf("day").diff(momentParam.startOf("day"), 'days') === 0) {
                    cl += " today";
                }

                items.push({
                    val: momentParam.format('YYYY-MMM-D'),
                    label: momentParam.format('D'),
                    cl: cl
                });
            });
    },
    setMonths: function () {
        var start = this.now.clone().startOf('year'),
            end = this.now.clone().endOf('year'),
            items = this.items = [];
        this.type = 'months';
        var minDate = this.minDate;
        var maxDate = this.maxDate;
        moment()
            .range(start, end)
            .by('months', function (moment) {
                var cl = "";
                if ((minDate != null && minDate.isAfter(moment.clone().endOf('month'))) ||
                    (maxDate != null && maxDate.isBefore(moment.clone().startOf('month')))) {
                    cl = "fade";
                } else {
                    cl = 'active';
                }
                items.push({
                    val: moment.format('YYYY-MMM'),
                    label: moment.format('MMM'),
                    cl: cl
                });
            });
    },
    setYears: function () {
        var start = this.now.clone().subtract(12, 'year'),
            end = this.now.clone().add(22, 'year'),
            items = this.items = [];
        if (this.minDate != null && start.isBefore(this.minDate)) {
            start = this.minDate;
        }
        if (this.maxDate != null && end.isAfter(this.maxDate)) {
            end = this.maxDate;
        }
        this.years = [start.format('YYYY'), end.format('YYYY')].join('-');
        this.type = 'years';
        moment()
            .range(start, end)
            .by('years', function (moment) {
                items.push({
                    val: moment.format('YYYY'),
                    label: moment.format('YYYY'),
                    cl: 'active'
                });
            });
    }
});
