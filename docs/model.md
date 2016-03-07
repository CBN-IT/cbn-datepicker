# Date Elements Model Internals

This file describes the model (value) use cases and internals for the date picker elements.

## Calendar Element

'Direct' value setting:

- from the UI (i.e. clicking a date);
- using data binding on `date` and modifying it externally;

'Indirect' value setting:

- calling `setDate` with the indirect parameter to true;

### Use cases + implementation details: 

1. `date` is changed programmatically / via data binding ('indirect' change):
    - **entrypoint**: `_dateChanged` observer, `this._dateIndirectlyChanged` == true
    - the date is parsed and `_date` is populated with the moment() object (or null, if failed);
    - 

2. The user selects a date ('direct' change) using the UI:
    
    2.1. The user clicks a date
        - **entrypoint**: 

