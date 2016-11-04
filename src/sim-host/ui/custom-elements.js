// Copyright (c) Microsoft Corporation. All rights reserved.

var dialog = require('dialog'),
    utils = require('utils');

var uniqueIdSuffix = 0;
var interactiveElementSelector = '* /deep/ input, * /deep/ select, * /deep/ button, * /deep/ textarea';

function initialize(changePanelVisibilityCallback) {
    registerCustomElement('cordova-panel', {
        proto: {
            cordovaCollapsed: {
                set: function (value) {
                    var icon = this.shadowRoot.querySelector('.cordova-collapse-icon');
                    var content = this.shadowRoot.querySelector('.cordova-content');
                    var isCurrentlyCollapsed = icon.classList.contains('cordova-collapsed');

                    if (value && !isCurrentlyCollapsed) {
                        collapsePanel(icon, content);
                    } else if (!value && isCurrentlyCollapsed) {
                        expandPanel(icon, content);
                    }
                }
            },
            enabled: {
                set: function (value) {
                    if (value) {
                        if (this.elementEnabledState) {
                            this.elementEnabledState.forEach(function (enabledState) {
                                enabledState.element.disabled = enabledState.disabled;
                            });
                            delete this.elementEnabledState;
                            this.shadowRoot.querySelector('.cordova-panel-inner').setAttribute('tabIndex', '0');
                        }
                    } else {
                        this.elementEnabledState = [];
                        Array.prototype.forEach.call(this.querySelectorAll(interactiveElementSelector), function (element) {
                            this.elementEnabledState.push({element: element, disabled: element.disabled});
                            element.disabled = true;
                        }, this);
                        this.shadowRoot.querySelector('.cordova-panel-inner').setAttribute('tabIndex', '');
                    }
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('.cordova-panel-inner').focus();
                }
            }
        },
        initialize: function () {
            var content = this.shadowRoot.querySelector('.cordova-content');
            var panelId = this.getAttribute('id');
            var collapseIcon = this.shadowRoot.querySelector('.cordova-collapse-icon');

            this.shadowRoot.querySelector('.cordova-header span').textContent = this.getAttribute('caption');
            this.shadowRoot.querySelector('.cordova-header #panel-label').setAttribute('aria-label', this.getAttribute('panel-label'));
            
            function expandCollapse() {
                var collapsed = collapseIcon.classList.contains('cordova-collapsed');

                if (collapsed) {
                    expandPanel(collapseIcon, content);
                } else {
                    collapsePanel(collapseIcon, content);
                }

                if (changePanelVisibilityCallback && typeof changePanelVisibilityCallback === 'function') {
                    changePanelVisibilityCallback(panelId, !collapsed);
                }
            }

            this.shadowRoot.querySelector('.cordova-header').addEventListener('click', expandCollapse);
            this.shadowRoot.querySelector('.cordova-panel-inner').addEventListener('keydown', function (e) {
                if (e.target === this && e.keyCode === 32 && !isModifyKeyPressed(e)) {
                    expandCollapse();
                }
            });
        }
    });

    registerCustomElement('cordova-dialog', {
        proto: {
            show: {
                value: function () {
                    document.getElementById('popup-window').style.display = '';
                    this.style.display = '';

                    // Set focus to first focusable element in panel (simplistic until we need otherwise).
                    var focusElement = this.querySelector(interactiveElementSelector);
                    if (focusElement) {
                        focusElement.focus();
                    }
                }
            },
            hide: {
                value: function () {
                    document.getElementById('popup-window').style.display = 'none';
                    this.style.display = 'none';
                }
            }
        },
        initialize: function () {
            this.shadowRoot.querySelector('.cordova-header span').textContent = this.getAttribute('caption');
            this.shadowRoot.querySelector('.cordova-close-icon').addEventListener('click', function () {
                dialog.hideDialog();
            });
            this.addEventListener('keydown', function (e) {
                if (e.keyCode === 27 && !isModifyKeyPressed(e)) {
                    // Escape key pressed
                    dialog.hideDialog();
                }
            });
        }
    });

    registerCustomElement('cordova-item-list', {
        proto: {
            addItem: {
                value: function (item) {
                    this.appendChild(item);
                }
            },
            removeItem: {
                value: function (item) {
                    this.removeChild(this.children[item]);
                }
            }
        },
        initialize: function () {
            this.classList.add('cordova-group');
        }
    });

    registerCustomElement('cordova-item', {
        proto: {
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('.cordova-item-wrapper').focus();
                }
            }
        },
        initialize: function () {
            this.classList.add('cordova-group');

            this.addEventListener('mousedown', function () {
                var that = this;
                window.setTimeout(function () {
                    if (document.activeElement !== that) {
                        that.focus();
                    }
                }, 0);
            });

            var that = this;
            this.shadowRoot.querySelector('.close-button').addEventListener('click', function () {
                removeItem(that);
            });

            this.addEventListener('keydown', function (e) {
                if (isModifyKeyPressed(e)) {
                    return;
                }

                var list, childIndex;

                switch (e.keyCode) {
                    case 46:
                        // Delete key
                        removeItem(this, true);
                        break;

                    case 38:
                        // Up arrow
                        e.preventDefault();
                        list = this.parentNode;
                        childIndex = getItemIndex(this, list);
                        if (childIndex > 0) {
                            list.children[childIndex - 1].focus();
                        }
                        break;

                    case 40:
                        // Down arrow
                        e.preventDefault();
                        list = this.parentNode;
                        childIndex = getItemIndex(this, list);
                        if (childIndex < list.children.length - 1) {
                            list.children[childIndex + 1].focus();
                        }
                        break;
                }
            });

            function getItemIndex(item, list) {
                return list && list.tagName === 'CORDOVA-ITEM-LIST' ? Array.prototype.indexOf.call(list.children, item) : -1;
            }

            function removeItem(item, setFocus) {
                var list = item.parentNode;

                // If we're within a list, calculate index in the list
                var childIndex = getItemIndex(item, list);
                if (childIndex > -1) {
                    // Raise an event on ourselves
                    var itemRemovedEvent = new CustomEvent('itemremoved', { detail: { itemIndex: childIndex }, bubbles: true });
                    item.dispatchEvent(itemRemovedEvent);

                    list.removeChild(item);

                    if (setFocus) {
                        var itemCount = list.children.length;
                        if (itemCount > 0) {
                            if (childIndex >= itemCount) {
                                childIndex = itemCount - 1;
                            }
                            list.children[childIndex].focus();
                        } else {
                            // If no items left, set focus to containing panel if there is one
                            var panel = findParent(list, 'cordova-panel');
                            panel && panel.focus();
                        }
                    }
                }
            }
        }
    });

    registerCustomElement('cordova-panel-row', {
        initialize: function () {
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
        }
    });

    registerCustomElement('cordova-group', {
        initialize: function () {
            this.classList.add('cordova-group');
        }
    });

    registerCustomElement('cordova-checkbox', {
        proto: {
            checked: {
                get: function () {
                    return this.shadowRoot.querySelector('input').checked;
                },
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'checked', value);
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('input').focus();
                }
            }
        },
        initialize: function () {
            if (this.parentNode.tagName === 'CORDOVA-PANEL') {
                this.classList.add('cordova-panel-row');
                this.classList.add('cordova-group');
            } else {
                // Reverse the order of the checkbox and caption
                this.shadowRoot.appendChild(this.shadowRoot.querySelector('label'));
            }
        },
        mungeIds: 'cordova-checkbox-template-input'
    });

    registerCustomElement('cordova-radio', {
        proto: {
            checked: {
                get: function () {
                    return this.shadowRoot.querySelector('input').checked;
                },
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'checked', value);
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('input').focus();
                }
            }
        },
        initialize: function () {
            var isChecked = this.getAttribute('checked');
            if (isChecked && isChecked.toLowerCase() === 'true') {
                this.shadowRoot.querySelector('input').checked = true;
            }

            var parentGroup = findParent(this, 'cordova-group');
            if (parentGroup) {
                var radioButton = this.shadowRoot.querySelector('input');
                radioButton.setAttribute('name', parentGroup.id);
            }
        },
        mungeIds: 'cordova-radio-template-input'
    });

    registerCustomElement('cordova-label', {
        proto: {
            value: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('label'), 'textContent', value);
                },
                get: function () {
                    return this.shadowRoot.querySelector('label').textContent;
                }
            }
        },
        initialize: function () {
            this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
            this.shadowRoot.querySelector('label').setAttribute('for', this.getAttribute('for'));
            this.setAttribute('for', '');
        }
    });

    registerCustomElement('cordova-text-entry', {
        proto: {
            value: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'value', value);
                },

                get: function () {
                    return this.shadowRoot.querySelector('input').value;
                }
            },
            disabled: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'disabled', value);
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('input').focus();
                }
            }
        },
        initialize: function () {
            this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
        },
        eventTarget: 'input',
        mungeIds: 'cordova-text-entry-template-input'
    });

    registerCustomElement('cordova-number-entry', {
        proto: {
            value: {
                set: function (value) {
                    if (utils.isNumber(value)) {
                        this._internalValue = value;
                    } else {
                        value = this._internalValue;
                    }

                    setValueSafely(this.shadowRoot.querySelector('input'), 'value', value);
                },

                get: function () {
                    return this.shadowRoot.querySelector('input').value;
                }
            },
            disabled: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'disabled', value);
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('input').focus();
                }
            }
        },
        initialize: function () {
            this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
            this._internalValue = 0;

            var input = this.shadowRoot.querySelector('input');

            var maxValue = this.getAttribute('max'),
                minValue = this.getAttribute('min'),
                value = this.getAttribute('value'),
                step = this.getAttribute('step');

            // initialize _internalValue with one of the available values,
            // otherwise it remains 0
            if (value !== null && utils.isNumber(value)) {
                this._internalValue = value;
            } else if (minValue !== null && utils.isNumber(minValue)) {
                this._internalValue = minValue;
            } else if (maxValue !== null && utils.isNumber(maxValue) && this._internalValue > parseFloat(maxValue)) {
                this._internalValue = maxValue;
            }

            if (maxValue !== null) input.setAttribute('max', maxValue);
            if (minValue !== null) input.setAttribute('min', minValue);
            if (step !== null) input.setAttribute('step', step);
            if (value !== null) input.setAttribute('value', value);

            // verify and force the input value to be a valid number
            input.addEventListener('input', function (event) {
                var value = event.target.value;

                if (utils.isNumber(value)) {
                    this._internalValue = value;
                } else {
                    // the new value is not a number, set the value to the
                    // latest number value
                    input.value = this._internalValue;
                    return false;
                }
            }.bind(this));
        },
        eventTarget:'input',
        mungeIds: 'cordova-number-entry-template-input'
    });

    registerCustomElement('cordova-labeled-value', {
        proto: {
            label: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('label'), 'textContent', value);
                },

                get: function () {
                    return this.shadowRoot.querySelector('label').textContent;
                }
            },
            value: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('span'), 'textContent', value);
                },

                get: function () {
                    return this.shadowRoot.querySelector('span').textContent;
                }
            }
        },
        initialize: function () {
            this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
            this.shadowRoot.querySelector('span').textContent = this.getAttribute('value');
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
        }
    });

    registerCustomElement('cordova-button', {
        proto: {
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('button').focus();
                }
            }
        },
        eventTarget: 'button'
    });

    registerCustomElement('cordova-file', {
        proto: {
            input: {
                get: function () {
                    return this.shadowRoot.querySelector('input');
                }
            },
            files: {
                get: function () {
                    return this.shadowRoot.querySelector('input').files;
                }
            },
            accept: {
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('input'), 'accept', value);
                }
            }
        },
        eventTarget: 'input'
    });

    registerCustomElement('cordova-combo', {
        proto: {
            options: {
                get: function () {
                    return this.shadowRoot.querySelector('select').options;
                }
            },
            selectedIndex: {
                get: function () {
                    return this.shadowRoot.querySelector('select').selectedIndex;
                }
            },
            value: {
                get: function () {
                    return this.shadowRoot.querySelector('select').value;
                },
                set: function (value) {
                    setValueSafely(this.shadowRoot.querySelector('select'), 'value', value);
                }
            },
            appendChild: {
                value: function (node) {
                    this.shadowRoot.querySelector('select').appendChild(node);
                }
            },
            focus: {
                value: function () {
                    this.shadowRoot.querySelector('select').focus();
                }
            }
        },
        initialize: function () {
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
            var select = this.shadowRoot.querySelector('select');
            var label = this.getAttribute('label');
            if (label) {
                this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
            } else {
                select.style.width = this.style.width || '100%';
                select.style.minWidth = this.style.minWidth;
            }
            // Move option elements to be children of select element
            var options = this.querySelectorAll('option');
            Array.prototype.forEach.call(options, function (option) {
                select.appendChild(option);
            });
        },
        eventTarget:'select',
        mungeIds: 'cordova-combo-template-select'
    });
}

/**
 * @param name The name of the custom element (corresponds to tag in html files).
 * @param opts - options for the creation of the element.
 * @param opts.proto Properties to set on the prototype.
 * @param opts.initialize Function to call when the custom element is initialized.
 * @param opts.eventTarget Selector for object to redirect events to.
 * @param opts.mungeIds An id or array of ids to 'munge' by pre-pending with custom element id or random value (to
 *        ensure unique in document)
 */
function registerCustomElement(name, opts) {
    var protoProperties = opts.proto;
    var initializeCallback = opts.initialize;
    var eventTargetSelector = opts.eventTarget;
    var mungeIds = opts.mungeIds;

    if (mungeIds && !Array.isArray(mungeIds)) {
        mungeIds = [mungeIds];
    }

    var constructorName = name.split('-').map(function (bit) {
        return bit.charAt(0).toUpperCase() + bit.substr(1);
    }).join('');

    var proto = Object.create(HTMLElement.prototype);
    if (protoProperties) {
        Object.defineProperties(proto, protoProperties);
    }

    function initialize() {
        this.initialized = true;

        var eventTarget = eventTargetSelector && this.shadowRoot.querySelector(eventTargetSelector);
        if (eventTarget) {
            // Make sure added events are redirected. Add more on<event> handlers here as we find they're needed
            Object.defineProperties(this, {
                addEventListener: {
                    value: function (a, b, c) {
                        eventTarget.addEventListener(a, b, c);
                    }
                },
                click: {
                    value: eventTarget.click
                },
                onclick: {
                    get: function () {
                        return eventTarget.onclick;
                    },
                    set: function (value) {
                        eventTarget.onclick = value;
                    }
                },
                onchange: {
                    get: function () {
                        return eventTarget.onchange;
                    },
                    set: function (value) {
                        eventTarget.onchange = value;
                    }
                }
            });
        }

        // We don't allow inline event handlers. Detect them and strip.
        var atts = this.attributes;
        Array.prototype.forEach.call(atts, function (att) {
            if (att.name.indexOf('on') === 0) {
                console.error('Unsupported inline event handlers detected: ' + name + '.' + att.name + '="' + att.value + '"');
                this.removeAttribute(att.name);
            }
        }, this);


        // Initialize if it is required
        initializeCallback && initializeCallback.call(this);

        // Apply attributes
    }

    proto.attachedCallback = function () {
        if (!this.initialized) {
            // If it hasn't already been initialized, do so now.
            initialize.call(this);
        }
    };

    proto.createdCallback = function () {
        var t = document.getElementById(name + '-template');
        var shadowRoot = this.createShadowRoot();
        shadowRoot.appendChild(document.importNode(t.content, true));

        if (mungeIds) {
            mungeIds.forEach(function (idToMunge) {
                var mungedId = idToMunge + '-' + uniqueIdSuffix++;
                var target = shadowRoot.querySelector('#' + idToMunge);
                if (target) {
                    target.setAttribute('id', mungedId);
                }

                var forElement = shadowRoot.querySelector('[for=' + idToMunge + ']');
                if (forElement) {
                    forElement.setAttribute('for', mungedId);
                }
            });
        }

        if (initializeCallback && this.ownerDocument === document) {
            // If it is being created in the main document, initialize immediately.
            initialize.call(this);
        }
    };

    window[constructorName] = document.registerElement(name, {
        prototype: proto
    });
}

function isModifyKeyPressed(e) {
    return e.altKey || e.ctrlKey || e.shiftKey || e.metaKey;
}

function collapsePanel(iconElem, content) {
    iconElem.classList.add('cordova-collapsed');
    content.style.display = 'none';
    content.style.height = '0';
}

function expandPanel(iconElem, content) {
    iconElem.classList.remove('cordova-collapsed');
    content.style.display = '';
    content.style.height = '';
}

function findParent(element, tag) {
    if (!Array.isArray(tag)) {
        tag = [tag];
    }

    var parent = element.parentNode;
    return parent && parent.tagName ? tag.indexOf(parent.tagName.toLowerCase()) > -1 ? parent : findParent(parent, tag) : null;
}

function setValueSafely(el, prop, value) {
    // In IE, setting the property when the element hasn't yet been added to the document can fail (like an issue with
    // the webcomponents polyfill), so do it after a setTimeout().
    if (el.ownerDocument.contains(el)) {
        el[prop] = value;
    } else {
        window.setTimeout(function () {
            el[prop] = value;
        }, 0);
    }
}

module.exports = {
    initialize: initialize
};

if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}
