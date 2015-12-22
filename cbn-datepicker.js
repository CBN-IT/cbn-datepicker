(function() {
	
	//noinspection JSUnusedGlobalSymbols
	/**
	 * This is a datepicker element
	 * @demo
	 */
	Polymer({
		is: 'cbn-datepicker',
		
		properties: {
			
			
			/**
			 * The datepicker's resulting input value.
			 * It contains always a correct date or a null / empty value otherwise.
			 */
			value: {
				type: String,
				value: '',
				notify: false, // the observer handles the notifications
				observer: '_valueChanged'
			},
			
			/**
			 * A placeholder to show when the value is empty.
			 */
			placeholder: {
				type: String,
				value: ''
			},
			
			/**
			 * The `format` attribute details http://momentjs.com/docs/#/parsing/string-format/.
			 */
			format: {
				type: String,
				value: 'DD MMMM YYYY'
			},
			
			/**
			 * The format to use for the input's model value ({@link #value} attribute).
			 * If the value format is empty, then {@link #format} will be used.
			 */
			valueFormat: {
				type: String,
				value: 'YYYY-MM-DD'
			},
			
			/**
			 * Specifies the minimum end of the calendar's date interval.
			 * Uses Moment.js formatting (see {@link #format}).
			 */
			minDate: {
				type: String,
				value: '-10y',
				observer: '_minDateChanged'
			},
			
			/**
			 * Specifies the minimum end of the calendar's date interval.
			 * Uses Moment.js formatting (see {@link #format}).
			 */
			maxDate: {
				type: String,
				value: '+10y',
				observer: '_maxDateChanged'
			},
			
			/**
			 * Specifies the maximum number of years to display in the calendar 'years range' view.
			 * Zero means show all years if min / max date is bounded, else defaults to 25 years.
			 */
			yearsRangeCount: {
				type: Number,
				value: 0
			},
			
			/**
			 * The position to show the calendar / picker.
			 * You can specify multiple positions separated by space.
			 * if auto is present, the position is automatically adjusted so that the picker is always visible in the
			 * current (at the moment of opening) viewport.
			 *
			 * Available values: auto | top | right | bottom | left
			 */
			position: {
				type: String,
				value: "auto bottom",
				observer: '_updatePosition'
			},
			
			// Private properties:
			
			/**
			 * Stores the currently selected date as a Moment.js object.
			 *
			 * Null if no date is selected / the value is empty.
			 */
			_date: {
				type: Object,
				value: null
			},
			
			/**
			 * Whether the calendar is currently open.
			 */
			_open: {
				type: Boolean,
				value: false
			},
			
			/**
			 * Stores the position classes of the calendar element.
			 */
			_positions: {
				type: Array,
				value: function() { return []; }
			},
			
			/**
			 * The current calendar view.
			 */
			_viewType: {
				type: String,
				value: 'days'
			},
			
			/**
			 * The user input's value containing the selected date or the value that the user is currently editing.
			 */
			_inputValue: {
				type: String,
				value: ''
			},
			
			/**
			 * The centered header strings to display at the top of the calendar.
			 * Depends on the current view. For example: '2014-2015', 'July 2015' etc.
			 */
			_calendarHeaderL: {
				type: String,
				value: ''
			},
			
			/**
			 * Same as {@link #_calendarHeaderL}, but stores the right side caption.
			 */
			_calendarHeaderR: {
				type: String,
				value: ''
			},
			
			/**
			 * The moment.js date that defines the current calendar view.
			 * Should never be null. Defaults to today.
			 */
			_calendarViewDate: {
				type: Object,
				value: function() { return moment() }
			},
			
			/**
			 * An array with the granular date items objects that are currently displayed in the calendar.
			 * The item's type depends on the current {@link #view}.
			 */
			_calendarItems: {
				type: Array,
				value: function() { return []; }
			},
			
			/**
			 * Stores the currently selected calendar item (for the current view).
			 * Used within the UI of the calendar to highlight the selected date.
			 */
			_calendarSelectedItem: {
				type: String,
				value: ''
			},
			
			/**
			 * True if the input needs to be refocused after the calendar closes.
			 */
			_refocus: {
				type: Boolean,
				value: false
			}
			
		},
		
		behaviors: [
			CbnForm.InputElement,
			CbnForm.Validatable,
			CbnForm.DynamicElement
		],
		
		/**
		 * Element's dynamically-configurable attributes.
		 * @type {Object}
		 */
		dynamicAttributes: {
			format: true,
			minDate: true,
			maxDate: true,
			position: true,
			placeholder: true
		},
		
		/**
		 * A read-only property that returns the descriptor object for the current view.
		 *
		 * @returns {Object}
		 */
		get _view() {
			return DatepickerViewConfig[this._viewType];
		},
		
		/**
		 * Computes the number of years to draw.
		 *
		 * @returns {Number} The number of years to draw.
		 */
		get _yearsRangeCount() {
			if (!this.yearsRangeCount) { // infer default value
				if (this._minDate && this._maxDate) {
					return Math.ceil(this._maxDate.diff(this._minDate, 'years', true));
				} else return 25;
			}
			return this.yearsRangeCount;
		},
		
		/**
		 * Will be set to true while the `value` property is changed internally.
		 */
		_dateValueUserChanged: false,
		
		ready: function() {
			this._readied = true;
			this._valueChanged();
		},
		
		// API methods:
		
		/**
		 * Overrides the `CbnForm.Validatable`'s `validate()` method to validate the input value.
		 */
		validate: function() {
			var result = false;
			if (this._inputValue) {
				result = this._validateDate(this._inputValue);
			}
			if (!result) {
				this.fire('cbn-form-validate', { result: result });
				return result;
			}
			return CbnForm.Validatable.validate.call(this);
		},
		
		/**
		 * Changes the currently selected date.
		 *
		 * @param {String|Date|Moment|null} date The date to set. Accepts both Strings and Moment / Date objects.
		 */
		setDate: function(date) {
			this._setDate(date);
			this._updateValue();
			this._updateDisplayValue();
		},
		
		/**
		 * Sets the date to today.
		 */
		setToday: function() {
			this._viewType = 'days';
			this.setDate(moment());
			this.close();
		},
		
		/**
		 * Clears the selected date.
		 */
		clear: function() {
			this.setDate('');
			this.close();
		},
		
		/**
		 * Opens up the calendar.
		 */
		open: function() {
			if (this._open) {
				return; // already open
			}
			if (this._date == null) {
				if (this._calendarViewDate == null)
					this._calendarViewDate = moment(); // default to today
				this._viewType = 'days';
			} else {
				this._calendarViewDate = this._date.clone();
			}
			this._render();
			this._open = true;
			this._updatePosition();
		},
		
		/**
		 * Hides the calendar.
		 */
		close: function() {
			this._refocus = false;
			this._open = false;
		},
		
		// Input value / date conversion logic
		
		/**
		 * Parses and sets the internal `_date` value to the specified value.
		 *
		 * Note: doesn't update the displayed / input values.
		 * Call `_updateDisplayValue` and/or `_updateValue` for doing this.
		 *
		 * @param {String|Date|Moment|null} date The date to set. Accepts both Strings and Moment / Date objects.
		 */
		_setDate: function(date) {
			var parsedDate = null;
			if (date) {
				parsedDate = this._parseDate(date);
				if (!parsedDate.isValid())
					parsedDate = null;
				if (parsedDate) {
					parsedDate = this._boundMinDate(parsedDate);
					parsedDate = this._boundMaxDate(parsedDate);
				}
			}
			
			this._date = parsedDate;
			
			// set the view / selected calendar dates
			this._calendarViewDate = (this._date ? this._date.clone() : moment());
			this._calendarSelectedItem = (this._date ? this._date.format(this._view.selectedFormat) : '' );
		},
		
		/**
		 * Updates the user-displayed input value to reflect the current {@link #_date} value.
		 */
		_updateDisplayValue: function() {
			this._inputValue = (this._date ? this._date.format(this.format) : '');
		},
		
		/**
		 * Updates the input's `value` property from the current {@link #_date} value.
		 */
		_updateValue: function() {
			this._dateValueUserChanged = true;
			try {
				this._setValue(this._date ? this._date.format( this.valueFormat ? this.valueFormat : this.format ) : '');
			} finally {
				this._dateValueUserChanged = false;
			}
		},
		
		/**
		 * Override the FormElement's value observer to prevent firing multiple `value-changed` events.
		 * We use our own transaction system.
		 */
		_fe_valueChanged: function() {
		},
		
		/**
		 * Called when the input's value property is indirectly changed (e.g. by the form).
		 */
		_valueChanged: function() {
			if (!this._readied) return;
				
			if (!this._dateValueUserChanged) {
				this._setDate(this.value);
				this._updateDisplayValue();
			}
			var newValue = ( this._date ? this._date.format( this.valueFormat ? this.valueFormat : this.format ) : '' );
			if (this.value != newValue || this._inputValueIndirectlyChanged) {
				// notify the parent form that our value was re-formatted
				this._setIndirectValue(newValue, {
					'reformatted': true
				});
			} else {
				this.fire('value-changed', {
					value: this.value
				});
			}
		},
		
		/**
		 * Called when the user changes the text input.
		 *
		 * If the text entered is parse-able as date, changes the currently selected date.
		 * If empty, it clears the input date.
		 */
		_inputValueChanged: function(event) {
			var input = event.currentTarget;
			// backup the input's selection
			// store current positions in variables
			var start = input.selectionStart,
				end = input.selectionEnd;
			
			this._inputValue = input.value;
			if (!this._inputValue || this._validateDate(this._inputValue)) {
				this._setDate(this._inputValue);
				this._updateValue();
			}
			
			// restore the selection
			input.setSelectionRange(start, end);
		},
		
		
		// Misc. event handlers / observers:
		
		/**
		 * Callback when an element instance is attached to the DOM. Used to set up event handlers.
		 */
		attached: function() {
			// capture those events for the element itself and all its children
			this.addEventListener('focus', this._focusHandler, true);
			this.addEventListener('blur', this._blurHandler, true);
		},
		
		/**
		 * Callback when an element instance is attached to the DOM. Used to clean up event handlers.
		 */
		detached: function() {
			this.removeEventListener('focus', this._focusHandler, true);
			this.removeEventListener('blur', this._blurHandler, true);
		},
		
		/**
		 * Called when the {@link #minDate} attribute is changed.
		 */
		_minDateChanged: function() {
			this._minDate = this._parseDate(/**@type {String}*/this.minDate);
		},
		
		/**
		 * Called when the {@link #maxDate} attribute is changed.
		 */
		_maxDateChanged: function() {
			this._maxDate = this._parseDate(/**@type {String}*/this.maxDate);
		},
		
		/**
		 * Captures the input key events to listen for special keys.
		 *
		 * @param event The key event.
		 */
		_inputKeyPress: function(event) {
			if (event.charCode == 13) { // Enter
				this._setDate(this._inputValue);
				this._updateValue();
				this._render();
			}
		},
		
		/**
		 * Captures the focus event on any of the element's children.
		 */
		_focusHandler: function (event) {
			if (event.target == this || this.contains(event.target)) {
				this._refocus = false;
				this.open();
			}
		},
		
		/**
		 * Captures the blur event on any of the element's children.
		 */
		_blurHandler: function() {
			this.async(function() {
				if (this._refocus || this.contains(document.activeElement)) {
					this.$.input.focus();
				} else {
					this.close();
				}
			});
		},
		
		/**
		 * Requests the datepicker's input to be refocused after the calendar is closed.
		 */
		_refocusInput: function() {
			this._refocus = true;
		},
		
		
		// UI-related functions (mainly for calendar rendering)
		
		/**
		 * Updates the calendar's position.
		 *
		 * Called automatically when the date picker opens.
		 */
		_updatePosition: function() {
			if (!this._open)
				return;
			
			// wait for CSS to get processed
			this.async(function() {
				// calculate current positions / sizes
				var elemRect = this.getBoundingClientRect();
				var calendarRect = this.$.calendar.getBoundingClientRect();
				var viewportWidth = document.documentElement.clientWidth;
				var viewportHeight = document.documentElement.clientHeight;
				
				var positions = this.position.split(' ');
				var auto = (positions.indexOf('auto') >= 0);
				var classes = [];
				
				if (auto && positions.length == 1) {
					positions = [ 'bottom' ]; // default to 'auto bottom'
				}
				
				for (var i=0; i<positions.length; i++) {
					var pos = positions[i];
					switch (pos) {
						case 'left':
							if ((elemRect.left - calendarRect.width) < 0) {
								if (auto) pos = 'right'; // mirror to the right
							}
							break;
						case 'right':
							if ((elemRect.right + calendarRect.width) > viewportWidth) {
								if (auto) pos = 'left'; // mirror to the right
							}
							break;
						case 'top':
							if ((elemRect.top - calendarRect.height) < 0) {
								if (auto) pos = 'bottom'; // mirror to the right
							}
							break;
						case 'bottom':
							if ((elemRect.bottom + calendarRect.height) > viewportHeight) {
								if (auto) pos = 'left'; // mirror to the right
							}
							break;
						case 'auto': pos = ''; break; // ignore
					}
					if (pos) {
						classes.push(pos);
					}
				}
				this._positions = classes;
			});
		},
		
		/**
		 * Called when the user clicks a calendar item.
		 * Sets the date and changes the view.
		 */
		_selectItem: function(event) {
			var selectedItem = event.model.item;
			if (!selectedItem.val)
				return;
			
			this._calendarSelectedItem = selectedItem.val;
			
			var clickedDate = moment(selectedItem.val, this._view.selectedFormat);
			if (!clickedDate || !clickedDate.isValid())
				return;
			
			// if the user clicked a day from another month, don't close the picker; instead, navigate to the new month
			if (this._viewType == 'days' && clickedDate.month() != this._calendarViewDate.month()) {
				this.setDate(clickedDate);
				this._render();
				
			} else {
				this._calendarViewDate = clickedDate;
				// try to navigate down
				this._navigateDown();
			}
		},
		
		/**
		 * Navigates down from the current view hierarchy (i.e. from 'years' to 'months').
		 * If already at the last view (days), will select the date ({@link #_calendarViewDate}) and close the dialog.
		 */
		_navigateDown: function() {
			if (this._viewType == 'days') {
				this.setDate(this._calendarViewDate);
				this.close();
				return;
			}
			if (this._view.navigateDown)
				this._viewType = this._view.navigateDown;
			this._render();
		},
		
		/**
		 * Navigates up from the current view (i.e. from 'days' to 'months').
		 * It's a no-op if already at the root view ('years').
		 */
		_navigateUp: function() {
			if (this._view.navigateUp)
				this._viewType = this._view.navigateUp;
			this._render();
		},
		
		/**
		 * Navigates to the left header button (whose action depends on the current view).
		 */
		_navigateHeaderL: function() {
			// always navigate one view up
			this._navigateUp();
		},
		
		/**
		 * Navigates to the right header button (whose action depends on the current view).
		 */
		_navigateHeaderR: function() {
			switch (this._viewType) {
				case 'days': // go to 'years'
					this._viewType = 'years';
					break;
			}
			this._render();
		},
		
		/**
		 * Navigates to the previous parent item (if available).
		 */
		_navigatePrev: function() {
			var newDate = this._calendarViewDate.clone();
			if (this._view.navigateLR == 'yearsRange') {
				newDate.add(-1, 'y');
				// check bounds
				var checkDate = newDate.clone().subtract(Math.floor(this._yearsRangeCount / 2), 'y');
				if (this._minDate && this._minDate.isAfter(checkDate)) {
					newDate = this._calendarViewDate;
				}
				
			} else if (this._view.navigateLR) {
				newDate.add(-1, this._view.navigateLR);
				newDate = this._boundMinDate(newDate);
			}
			
			this._calendarViewDate = newDate;
			this._render();
		},
		
		/**
		 * Navigates to the next parent item (if available).
		 */
		_navigateNext: function() {
			var newDate = this._calendarViewDate.clone();
			
			if (this._view.navigateLR == 'yearsRange') {
				newDate.add(1, 'y');
				// check bounds
				var checkDate = newDate.clone().add(Math.ceil(this._yearsRangeCount / 2), 'y');
				if (this._maxDate && this._maxDate.isBefore(checkDate)) {
					newDate = this._calendarViewDate;
				}
			} else if (this._view.navigateLR) {
				newDate.add(1, this._view.navigateLR);
				newDate = this._boundMaxDate(newDate);
			}
			
			this._calendarViewDate = newDate;
			this._render();
		},
		
		/**
		 * [Re]Renders the calendar.
		 * Called whenever the date or the input's value is changed.
		 */
		_render: function() {
			// reset UI elements
			this._calendarHeaderL = '';
			this._calendarHeaderR = '';
			this._calendarItems = [];
			
			if (this._view.displayHeaderL && this._view.displayHeaderL != 'special')
				this._calendarHeaderL = this._calendarViewDate.format(this._view.displayHeaderL);
			if (this._view.displayHeaderR)
				this._calendarHeaderR = this._calendarViewDate.format(this._view.displayHeaderR);
			
			this[this._view.renderFun]();
			
			if (this._viewType == 'years') {
				if (this._calendarItems.length) { // show years range
					this._calendarHeaderL = this._calendarItems[0].label +
						' - ' + this._calendarItems[this._calendarItems.length - 1].label;
				}
			}
			
			this._calendarSelectedItem = (this._date ? this._date.format(this._view.selectedFormat) : '' );
		},
		
		/**
		 * Fills the {@link #_calendarItems} property with the days to be printed on the calendar.
		 * Used when {@link #view} == 'days'.
		 */
		_renderDays: function() {
			var start = this._calendarViewDate.clone().startOf('month').day(0);
			var end = this._calendarViewDate.clone().endOf('month').day(6);
			
			var month = this._calendarViewDate.month();
			
			// start by printing the week days
			this.set('_calendarItems', this._getWeekDays());
			
			// now add each day of the month
			moment()
				.range(start, end)
				.by('days', function (momentParam) {
					var item = {
						val: momentParam.format(this._view.selectedFormat),
						label: momentParam.format('D'),
						cl: 'days'
					};
					
					if ((this._minDate != null && this._minDate.isAfter(momentParam)) ||
						(this._maxDate != null && this._maxDate.isBefore(momentParam))) {
						item.cl += " fade";
						item.val = null;
						
					} else if (momentParam.month() === month) {
						item.cl += ' active';
					} else {
						item.cl += ' active fade';
					}
					if (moment().startOf("day").diff(momentParam.startOf("day"), 'days') === 0) {
						item.cl += " today";
					}
					
					this.push('_calendarItems', item);
					
				}.bind(this));
		},
		
		/**
		 * Returns the UI items representing the week days.
		 * Used when {@link #view} == 'days'.
		 */
		_getWeekDays: function() {
			var start = moment().day(0),
				end = moment().day(6),
				days = [];
			moment()
				.range(start, end)
				.by('days', function (moment) {
					days.push({
						val: null,
						label: moment.format('dd'),
						cl: 'days heading'
					});
				}.bind(this));
			return days;
		},
		
		/**
		 * Fills the {@link #_calendarItems} property with the months to be printed on the calendar.
		 * Used when {@link #view} == 'months'.
		 */
		_renderMonths: function() {
			var start = this._calendarViewDate.clone().startOf('year'),
				end = this._calendarViewDate.clone().endOf('year');
			
			this.set('_calendarItems', []);
			moment()
				.range(start, end)
				.by('months', function (moment) {
					var item = {
						val: moment.format(this._view.selectedFormat),
						label: moment.format('MMM'),
						cl: 'months'
					};
					
					if ((this._minDate != null && this._minDate.isAfter(moment.clone().endOf('month'))) ||
						(this._maxDate != null && this._maxDate.isBefore(moment.clone().startOf('month')))) {
						item.cl += " fade";
						item.val = null;
					} else {
						item.cl += ' active';
					}
					
					this.push('_calendarItems', item);
					
				}.bind(this));
		},
		
		/**
		 * Fills the {@link #_calendarItems} property with the days to be printed on the calendar.
		 * Used when {@link #view} == 'years'.
		 */
		_renderYears: function() {
			this.set('_calendarItems', []);
			var count = this._yearsRangeCount;
			var start = this._calendarViewDate.clone().subtract(Math.floor(count / 2), 'year');
			start = this._boundMinDate(start);
			var end = start.clone().add(count, 'years');
			end = this._boundMaxDate(end);
			
			moment()
				.range(start, end)
				.by('years', function (moment) {
					this.push('_calendarItems', {
						val: moment.format(this._view.selectedFormat),
						label: moment.format('YYYY'),
						cl: 'years active'
					});
				}.bind(this));
		},
		
		// UI computation methods:
		
		/**
		 * Computes the #calendar component's class list.
		 *
		 * @param open Whether the calendar is open.
		 * @param positions The positions array.
		 * @return {String} The calendar container's classes.
		 */
		_computeCalendarClasses: function(open, positions) {
			return positions.join(' ') + (open ? ' open' : '' );
		},
		
		/**
		 * Computes a header caption's class list.
		 *
		 * @param value The text to display (if any).
		 * @return {String} The header caption's classes.
		 */
		_computeHeaderClasses: function (value) {
			return 'flex colored header' + (value ? '' : ' hidden' );
		},
		
		/**
		 * Computes a calendar item's classes.
		 * @param item The item to compute the class for.
		 * @param selectedValue The currently selected item.
		 * @return {String} The item's classes.
		 */
		_computeItemClasses: function(item, selectedValue) {
			return item.cl + (selectedValue == item.val ? ' selected' : '');
		},
		
		
		// Date manipulation methods
		
		/**
		 * Parses a date string using the configured {@link #format} and returns a Moment.js object.
		 * Also accepts Date and moment objects.
		 *
		 * @param {String|Date|moment} dateStr The input date.
		 * @returns {moment|null} The Moment object representing the date.
		 */
		_parseDate: function(dateStr) {
			var date = null;
			if (dateStr != null) {
				if (typeof dateStr === "string") {
					// accept relative dates
					// e.g. "+1d", "-5w" etc.
					var pattern = /([+\-][0-9]+)\s*(d|w|m|y|q)/ig;
					var matches = pattern.exec(dateStr);
					
					if (matches) {
						date = moment().startOf("day");
						while (matches) {
							switch ((matches[2] + '').toLowerCase() || "d") {
								case "d":
								case "D":
									date.add(parseInt(matches[1], 10), "d");
									break;
								case "w":
								case "W":
									date.add(parseInt(matches[1], 10), "w");
									break;
								case "m":
								case "M":
									date.add(parseInt(matches[1], 10), "M");
									break;
								case "q":
								case "Q":
									date.add(parseInt(matches[1], 10), "Q");
									break;
								case "y":
								case "Y":
									date.add(parseInt(matches[1], 10), "y");
									break;
							}
							matches = pattern.exec(dateStr);
						}
						
					} else {
						date = moment(dateStr, [ this.valueFormat, this.format ]);
					}
				} else {
					date = moment(dateStr);
				}
			}
			return date;
		},
		
		/**
		 * validates the specified date string and returns true if parseable.
		 *
		 * @param {String} dateStr The date string to validate.
		 * @returns {Boolean} Whether the string is valid.
		 */
		_validateDate: function(dateStr) {
			if (!dateStr) return false;
			var parsed = this._parseDate(dateStr);
			return (parsed && parsed.isValid());
		},
		
		/**
		 * Takes an arbitrary moment object and checks it using the {@link #_minDate} attribute.
		 * If it is greater, it returns the unaltered object, otherwise it returns a cloned value of {@link #_minDate}.
		 *
		 * @param {moment} date The date to be bounded.
		 * @return {moment} A date within the limits.
		 */
		_boundMinDate: function(date) {
			if (this._minDate != null && date.isBefore(this._minDate)) {
				return this._minDate.clone();
			}
			return date;
		},
		
		/**
		 * Takes an arbitrary moment object and checks it using the {@link #_minDate} attribute.
		 * If it is greater, it returns the unaltered object, otherwise it returns a cloned value of {@link #_minDate}.
		 *
		 * @param {moment} date The date to be bounded.
		 * @return {moment} A date within the limits.
		 */
		_boundMaxDate: function(date) {
			if (this._maxDate != null && date.isAfter(this._maxDate)) {
				return this._maxDate.clone();
			}
			return date;
		}
		
		// The End!
		
	});
	
	/**
	 * Stores the descriptors/configuration for each view.
	 * @type {Object}
	 */
	var DatepickerViewConfig = {
		'days': {
			selectedFormat: 'YYYY-MM-DD',
			navigateUp: 'months',
			displayHeaderL: 'MMM',
			displayHeaderR: 'YYYY',
			navigateLR: 'M',
			renderFun: '_renderDays'
		},
		'months': {
			selectedFormat: 'YYYY-MM',
			navigateUp: 'years',
			navigateDown: 'days',
			navigateLR: 'y',
			displayHeaderL: 'YYYY',
			renderFun: '_renderMonths'
		},
		'years': {
			selectedFormat: 'YYYY',
			navigateDown: 'months',
			displayHeaderL: 'special',
			navigateLR: 'yearsRange',
			renderFun: '_renderYears'
		}
	};
	
	CbnForm.registerElement('cbn-datepicker', {
		types: ['date']
	});
	
})();
