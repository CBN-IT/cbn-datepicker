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
	Polymer(CbnForm.implement({
		
		publish: {
			
			/**
			 * The name of the input.
			 */
			name: '',
			
			/**
			 * The input value, as string (represented using {@link #format}).
			 *
			 * @attribute value
			 * @type {String}
			 */
			value: '',
			
			/**
			 * A placeholder to show when the value is empty.
			 * 
			 * @attribute placeholder
			 * @type {String}
			 */
			placeholder: '',
			
			/**
			 * The `format` attribute details http://momentjs.com/docs/#/parsing/string-format/.
			 * 
			 * @attribute format
			 * @type {String}
			 */
			format: 'DD MMMM YYYY',
			
			/**
			 * The format to use for the input's model value ({@link #value} attribute).
			 * If the value format is empty, then {@link #format} will be used.
			 * 
			 * 
			 * @attribute valueFormat
			 * @type {String}
			 */
			valueFormat: 'YYYY-MM-DD',
			
			/**
			 * Specifies the minimum end of the calendar's date interval.
			 * Uses Moment.js formatting (see {@link #format}).
			 *
			 * @attribute minDate
			 * @type {String}
			 */
			minDate: '-10y',
			
			/**
			 * Specifies the minimum end of the calendar's date interval.
			 * Uses Moment.js formatting (see {@link #format}).
			 *
			 * @attribute minDate
			 * @type {String}
			 */
			maxDate: '+10y',
			
			/**
			 * The position to show the calendar / picker.
			 * You can specify multiple positions separated by space.
			 * if auto is present, the position is automatically adjusted so that the picker is always visible in the 
			 * current (at the moment of opening) viewport.
			 * 
			 * Available values: auto | top | right | bottom | left
			 * 
			 * @attribute minDate
			 * @type {String}
			 * @default ''
			 */
			position: "auto bottom",
			
			/**
			 * The current calendar view.
			 * @private
			 * @type {String}
			 */
			view: 'days'
			
		},
		
		/**
		 * Element's dynamically-configurable attributes.
		 * @type {Object}
		 */
		dynamicAttributes: {
			"format": {type: 'attribute'},
			"minDate": {type: 'attribute'},
			"maxDate": {type: 'attribute'},
			"position": {type: 'attribute'},
			"placeholder": {type: 'attribute'}
		},
		
		// Private properties
		
		/**
		 * Stores the currently selected date as a Moment.js object.
		 * Null if no date is selected / the value is empty.
		 *
		 * @private
		 * @type {moment}
		 */
		_date: null,
		
		/**
		 * A read-only property that returns the descriptor object for the current view.
		 * @private
		 * @returns {Object}
		 */
		get _view() {
			return DatepickerViewConfig[this.view];
		},
		
		/**
		 * The value to display inside the input's textbox.
		 * @private
		 * @type {String}
		 */
		_displayValue: '',
		
		/**
		 * The centered header strings to display at the top of the calendar.
		 * Depends on the current view. For example: '2014-2015', 'July 2015' etc.
		 * @private
		 * @type {String}
		 */
		_displayHeaderL: '', _displayHeaderR: '',
		
		/**
		 * The date that defines the current calendar view.
		 * Should never be null. Defaults to today.
		 * @type {moment}
		 */
		_displayDate: null,
		
		/**
		 * The display date, as string.
		 * @type {String}
		 */
		_displayDateStr: '',
		
		/**
		 * An array with the granular date items objects that are currently displayed in the calendar.
		 * The item's type depends on the current {@link #view}.
		 * @private
		 * @type {[Object]}
		 */
		_displayItems: null,
		
		/**
		 * Stores the currently selected calendar item (for the current view).
		 * Used by `core-selector` within the UI of the calendar.
		 * @private
		 * @type {Object}
		 */
		_displaySelectedItem: null,
		
		/**
		 * True if the input needs to be refocused after the calendar closes.
		 * @private
		 * @type {Boolean}
		 */
		_refocus: false,
		
		
		// API methods:
		
		/**
		 * Sets the date to today.
		 */
		setToday: function() {
			this._date = moment();
			this.view = 'days';
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
			if (this.$.calendar.classList.contains('show')) {
				return; // already open
			}
			if (this._date == null) {
				if (this._displayDate == null)
					this._displayDate = moment();
				this.view = 'days';
			} else {
				this._displayDate = this._date.clone();
			}
			this._render();
			this.$.calendar.classList.add("show");
			this._updatePosition();
		},
		
		/**
		 * Hides the calendar.
		 */
		close: function() {
			this._refocus = false;
			this.$.calendar.classList.remove("show");
		},
		
		
		// Implementation: 
		
		/**
		 * Called when a new date element is created.
		 * Used to initialize properties to their default values.
		 */
		created: function() {
			this._displayItems =
			this._displayDate = moment();
		},
		
		
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
		 * Called when the {@link #position} property is changed.
		 * Updates the calendar's position.
		 */
		positionChanged: function() {
			this._updatePosition();
		},
		
		/**
		 * Called when the {@link #minDate} attribute is changed.
		 */
		minDateChanged: function() {
			this._minDate = this._parseDate(this.minDate);
		},
		
		/**
		 * Called when the {@link #maxDate} attribute is changed.
		 */
		maxDateChanged: function() {
			this._maxDate = this._parseDate(this.maxDate);
		},
		
		/**
		 * Called when the {@link #value} property is changed (either externally or by using the embedded text input to edit
		 * the date).
		 */
		valueChanged: function() {
			this._updateDate();
			this._updateValue();
			
			// fire 'input' / 'change' events
			this.fire('input');
			this.fire('change');
			this.close();
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
		 * Stops all 'input'/'change' events generated by the inner input.
		 *
		 * @param {Event} event The DOM event object.
		 * @private
		 */
		_inputTyped: function(event) {
			event.stopPropagation();
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
			if (!this.$.calendar.classList.contains('show')) 
				return;
			
			// wait for CSS to get processed
			this.async(function() {
				// clean up positioning classes
				this.$.calendar.classList.remove("left");
				this.$.calendar.classList.remove("right");
				this.$.calendar.classList.remove("top");
				this.$.calendar.classList.remove("bottom");
				
				// calculate current positions / sizes
				var elemRect = this.getBoundingClientRect();
				var calendarRect = this.$.calendar.getBoundingClientRect();
				var viewportWidth = document.documentElement.clientWidth;
				var viewportHeight = document.documentElement.clientHeight;
				
				var positions = this.position.split(' ');
				var auto = (positions.indexOf('auto') >= 0);
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
						this.$.calendar.classList.add(pos);
					}
				}
			});
		},
		
		/**
		 * Called when the user clicks a calendar item.
		 * Sets the date and changes the view.
		 * @private
		 */
		_itemSelected: function(event) {
			var selectedItem = event.detail.item;
			if (!selectedItem.dataset.value)
				return;
			
			var clickedDate = moment(selectedItem.dataset.value, this._view.selectedFormat);
			if (!clickedDate || !clickedDate.isValid())
				return;
			
			// if the user clicked a day from another month, don't close the picker; instead, navigate to the new month
			if (this.view == 'days' && clickedDate.month() != this._displayDate.month()) {
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
			if (this.view == 'days') {
				this._date = this._displayDate.clone();
				this._updateValue();
				this.close();
				return;
			}
			if (this._view.navigateDown)
				this.view = this._view.navigateDown;
			this._render();
		},
		
		/**
		 * Navigates up from the current view (i.e. from 'days' to 'months').
		 * It's a no-op if already at the root view ('years').
		 * @private
		 */
		_navigateUp: function() {
			if (this._view.navigateUp)
				this.view = this._view.navigateUp;
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
			switch (this.view) {
				case 'days': // go to 'years'
					this.view = 'years';
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
			
			if (this.view == 'years') {
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
			this._displayItems = this._getWeekDays();
			
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
					
					this._displayItems.push(item);
					
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
			
			this._displayItems = [];
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
					
					this._displayItems.push(item);
					
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
			
			this._displayItems = [];
			start = this._boundMinDate(start);
			end = this._boundMaxDate(end);
			
			moment()
				.range(start, end)
				.by('years', function (moment) {
					this._displayItems.push({
						val: moment.format(this._view.selectedFormat),
						label: moment.format('YYYY'),
						cl: 'years active'
					});
				}.bind(this));
		},
		
		
		// Date / input value manipulation methods
		
		/**
		 * Updates the internal date object from the current {@link #value}.
		 * @private
		 */
		_updateDate: function() {
			if (this.value) {
				this._date = (this.value) ? this._parseDate(this.value) : null;
			} else {
				this._date = null;
			}
			if (!this._date || !this._date.isValid()) {
				this._date = null;
			}
			this._displayValue = (this._date ? this._date.format(this.format) : '' );
		},
		
		/**
		 * Updates the input's value from the current internal {@link #_date} object.
		 * @private
		 */
		_updateValue: function() {
			this.value = ( this._date ? this._date.format( this.valueFormat ? this.valueFormat : this.format ) : '' );
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
		
	}, CbnForm.AbstractInput, CbnForm.ValidatableInput, CbnForm.DynamicControl));
	
	CbnForm.registerElement('cbn-datepicker', {
		types: ['date']
	});
	
})();
