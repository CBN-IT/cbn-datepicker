(function() {
	
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
			renderFun: '_renderYears'
		}
	};
	
	//noinspection JSUnusedGlobalSymbols
	Polymer({
		is: 'cbn-datepicker',
		
		properties: {
			
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
			 * The value to display inside the input's text box.
			 */
			_displayValue: {
				type: String,
				value: ''
			},
			
			/**
			 * The centered header strings to display at the top of the calendar.
			 * Depends on the current view. For example: '2014-2015', 'July 2015' etc.
			 */
			_displayHeaderL: {
				type: String,
				value: ''
			},
			
			/**
			 * Same as {@link #_displayHeaderL}, but stores the right side caption.
			 */
			_displayHeaderR: {
				type: String,
				value: ''
			},
			
			/**
			 * The moment.js date that defines the current calendar view.
			 * Should never be null. Defaults to today.
			 */
			_displayDate: {
				type: Object,
				value: function() { return moment() }
			},
			
			/**
			 * The display date, as string.
			 */
			_displayDateStr: {
				type: String,
				value: ''
			},
			
			/**
			 * An array with the granular date items objects that are currently displayed in the calendar.
			 * The item's type depends on the current {@link #view}.
			 */
			_displayItems: {
				type: Array,
				value: function() { return []; }
			},
			
			/**
			 * Stores the currently selected calendar item (for the current view).
			 * Used by `array-selector` within the UI of the calendar.
			 */
			_displaySelectedItem: {
				type: Object,
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
		 * @private
		 * @returns {Object}
		 */
		get _view() {
			return DatepickerViewConfig[this._viewType];
		},
		
		
		// API methods:
		
		/**
		 * Sets the date to today.
		 */
		setToday: function() {
			this._date = moment();
			this._viewType = 'days';
			this._updateValue();
			this.close();
		},
		
		/**
		 * Clears the selected date.
		 */
		clear: function() {
			this._date = null;
			this._updateValue();
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
				if (this._displayDate == null)
					this._displayDate = moment();
				this._viewType = 'days';
			} else {
				this._displayDate = this._date.clone();
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
			this._updateDate();
			this._updateValue();
		},
		
		// UI computation methods:
		
		/**
		 * Computes the #calendar component's class list.
		 * 
		 * @param open Whether the calendar is open.
		 * @param positions The positions array.
		 * @return {String} The calendar container's classes.
		 * @private
		 */
		_computeCalendarClasses: function(open, positions) {
			return positions.join(' ') + (open ? ' open' : '' );
		},
		
		/**
		 * Computes a header caption's class list.
		 * 
		 * @param value The text to display (if any).
		 * @return {String} The header caption's classes.
		 * @private
		 */
		_computeHeaderClasses: function (value) {
			return 'flex colored header' + (value ? '' : ' hidden' );
		},
		
		/**
		 * Computes a calendar item's classes.
		 * @param item The item to compute the class for.
		 * @param selectedValue The currently selected item.
		 * @return {String} The item's classes.
		 * @private
		 */
		_computeItemClasses: function(item, selectedValue) {
			return item.cl + (selectedValue == item.val ? ' selected' : '');
		},
		
		
		// Implementation:
		
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
		 * Called when the {@link #_displayValue} property is changed (either externally or by using the embedded text 
		 * input to edit the date).
		 */
		_inputValueChanged: function() {
			// the value will be updated in the next microtask
			this.async(function() {
				this._updateDate(true);
			});
		},
		
		/**
		 * Captures the input key events to listen for Enter key presses.
		 * @param event The key event.
		 * @private
		 */
		_inputKeyPress: function(event) {
			if (event.charCode == 13) { // ENTER
				this._updateDate();
				this._updateValue();
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
		 * Called automatically when the date picker opens.
		 *
		 * @private
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
				for (var i=0; i<positions.length; i++) {
					var pos = positions[i];
					switch (pos) {
						case 'left':
							if ((elemRect.left - calendarRect.width) < 0) {
								pos = 'right'; // mirror to the right
							}
							break;
						case 'right':
							if ((elemRect.right + calendarRect.width) > viewportWidth) {
								pos = 'left'; // mirror to the right
							}
							break;
						case 'top':
							if ((elemRect.top - calendarRect.height) < 0) {
								pos = 'bottom'; // mirror to the right
							}
							break;
						case 'bottom':
							if ((elemRect.bottom + calendarRect.height) > viewportHeight) {
								pos = 'left'; // mirror to the right
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
		 * @private
		 */
		_selectItem: function(event) {
			var selectedItem = event.model.item;
			if (!selectedItem.val)
				return;
			
			this._displaySelectedItem = selectedItem.val;
			
			var clickedDate = moment(selectedItem.val, this._view.selectedFormat);
			if (!clickedDate || !clickedDate.isValid())
				return;
			
			// if the user clicked a day from another month, don't close the picker; instead, navigate to the new month
			if (this._viewType == 'days' && clickedDate.month() != this._displayDate.month()) {
				this._date = clickedDate;
				this._displayDate = this._date;
				this._updateValue();
				this._render();
				
			} else {
				this._displayDate = clickedDate;
				// try to navigate down
				this._navigateDown();
			}
		},
		
		/**
		 * Navigates down from the current view hierarchy (i.e. from 'years' to 'months').
		 * If already at the last view (days), will select the date ({@link #_displayDate}) and close the dialog.
		 *
		 * @private
		 */
		_navigateDown: function() {
			if (this._viewType == 'days') {
				this._date = this._displayDate.clone();
				this._updateValue();
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
		 * @private
		 */
		_navigateUp: function() {
			if (this._view.navigateUp)
				this._viewType = this._view.navigateUp;
			this._render();
		},
		
		/**
		 * Navigates to the left header button (whose action depends on the current view).
		 * @private
		 */
		_navigateHeaderL: function() {
			// always navigate one view up
			this._navigateUp();
		},
		
		/**
		 * Navigates to the right header button (whose action depends on the current view).
		 * @private
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
		 * @private
		 */
		_navigatePrev: function() {
			var newDate = this._displayDate.clone();
			if (this._view.navigateLR)
				newDate.add(-1, this._view.navigateLR);
			
			newDate = this._boundMinDate(newDate);
			this._displayDate = newDate;
			this._render();
		},
		
		/**
		 * Navigates to the next parent item (if available).
		 * @private
		 */
		_navigateNext: function() {
			var newDate = this._displayDate.clone();
			if (this._view.navigateLR)
				newDate.add(1, this._view.navigateLR);
			
			newDate = this._boundMaxDate(newDate);
			this._displayDate = newDate;
			this._render();
		},
		
		/**
		 * [Re]Renders the calendar.
		 * Called whenever the date or the input's value is changed.
		 * @private
		 */
		_render: function() {
			// reset UI elements
			this._displayHeaderL = '';
			this._displayHeaderR = '';
			this._displayItems = [];
			
			if (this._view.displayHeaderL && this._view.displayHeaderL != 'special')
				this._displayHeaderL = this._displayDate.format(this._view.displayHeaderL);
			if (this._view.displayHeaderR)
				this._displayHeaderR = this._displayDate.format(this._view.displayHeaderR);
			
			if (this._viewType == 'years') {
				if (this._displayItems.length) { // show years range
					this._displayHeaderL = this._displayItems[0].label +
						' - ' + this._displayItems[this._displayItems.length - 1].label;
				}
			}
			
			this[this._view.renderFun]();
			
			this._displaySelectedItem = (this._date ? this._date.format(this._view.selectedFormat) : '' );
		},
		
		/**
		 * Fills the {@link #_displayItems} property with the days to be printed on the calendar.
		 * Used when {@link #view} == 'days'.
		 * @private
		 */
		_renderDays: function() {
			var start = this._displayDate.clone().startOf('month').day(0);
			var end = this._displayDate.clone().endOf('month').day(6);
			
			var month = this._displayDate.month();
			
			// start by printing the week days
			this.set('_displayItems', this._getWeekDays());
			
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
					
					this.push('_displayItems', item);
					
				}.bind(this));
		},
		
		/**
		 * Returns the UI items representing the week days.
		 * Used when {@link #view} == 'days'.
		 * @private
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
		 * Fills the {@link #_displayItems} property with the months to be printed on the calendar.
		 * Used when {@link #view} == 'months'.
		 * @private
		 */
		_renderMonths: function() {
			var start = this._displayDate.clone().startOf('year'),
				end = this._displayDate.clone().endOf('year');
			
			this.set('_displayItems', []);
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
					
					this.push('_displayItems', item);
					
				}.bind(this));
		},
		
		/**
		 * Fills the {@link #_displayItems} property with the days to be printed on the calendar.
		 * Used when {@link #view} == 'years'.
		 * @private
		 */
		_renderYears: function() {
			var start = this._displayDate.clone().subtract(12, 'year'),
				end = this._displayDate.clone().add(22, 'year');
			
			this.set('_displayItems', []);
			start = this._boundMinDate(start);
			end = this._boundMaxDate(end);
			
			moment()
				.range(start, end)
				.by('years', function (moment) {
					this.push('_displayItems', {
						val: moment.format(this._view.selectedFormat),
						label: moment.format('YYYY'),
						cl: 'years active'
					});
				}.bind(this));
		},
		
		
		// Date / input value manipulation methods
		
		/**
		 * Updates the internal date object from the current {@link #value}.
		 * @param {Boolean} [noDisplay] Set to skip updating the displayed value.
		 * @private
		 */
		_updateDate: function(noDisplay) {
			var parsedDate = this._parseDate(this._displayValue);
			if (!this._displayValue || !parsedDate || !parsedDate.isValid()) {
				if (!noDisplay) {
					this._displayValue = '';
				}
				return;
			}
			
			parsedDate = this._boundMinDate(parsedDate);
			parsedDate = this._boundMaxDate(parsedDate);
			this._date = parsedDate;
			if (!noDisplay)
				this._displayValue = (this._date ? this._date.format(this.format) : '' );
			
			this._displaySelectedItem = (this._date ? this._date.format(this._view.selectedFormat) : '' );
		},
		
		/**
		 * Updates the input's value from the current internal {@link #_date} object.
		 * @param {Boolean} [noDisplay] Set to skip updating the displayed value.
		 * @private
		 */
		_updateValue: function(noDisplay) {
			this.value = ( this._date ? this._date.format( this.valueFormat ? this.valueFormat : this.format ) : '' );
			
			if (!noDisplay)
				this._displayValue = (this._date ? this._date.format(this.format) : '' );
		},
		
		/**
		 * Parses a date string using the configured {@link #format} and returns a Moment.js object.
		 * Also accepts Date and moment objects.
		 *
		 * @private
		 * @param {String|Date|moment} dateStr The input date.
		 * @returns {moment|null} The Moment object representing the date.
		 */
		_parseDate: function(dateStr) {
			var date = null;
			if (dateStr != null) {
				if (typeof dateStr === "string") {
					// accept relative dates
					// e.g. "+1d", "-5w" etc.
					var pattern = /([+\-]?[0-9]+)\s*(d|w|m|y|q)/ig;
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
					date = moment(date);
				}
			}
			return date;
		},
		
		/**
		 * Takes an arbitrary moment object and checks it using the {@link #_minDate} attribute.
		 * If it is greater, it returns the unaltered object, otherwise it returns a cloned value of {@link #_minDate}.
		 *
		 * @param {moment} date The date to be bounded.
		 * @return {moment} A date within the limits.
		 * @private
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
		 * @private
		 */
		_boundMaxDate: function(date) {
			if (this._maxDate != null && date.isAfter(this._maxDate)) {
				return this._maxDate.clone();
			}
			return date;
		}
		
		// The End!
		
	});
	
	CbnForm.registerElement('cbn-datepicker', {
		types: ['date']
	});
	
})();
