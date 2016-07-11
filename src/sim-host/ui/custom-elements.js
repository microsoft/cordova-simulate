// Copyright (c) Microsoft Corporation. All rights reserved.

var dialog = require('dialog');

function initialize(changePanelVisibilityCallback) {
    registerCustomElement('cordova-panel', {
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
        }
    }, function () {
        var panel = this;
        var content = panel.shadowRoot.querySelector('.cordova-content');
        var panelId = this.getAttribute('id');
        var collapseIcon = this.shadowRoot.querySelector('.cordova-collapse-icon');

        this.shadowRoot.querySelector('.cordova-header span').textContent = this.getAttribute('caption');
        this.shadowRoot.querySelector('.cordova-header').addEventListener('click', function () {
            var collapsed = collapseIcon.classList.contains('cordova-collapsed');

            if (collapsed) {
                expandPanel(collapseIcon, content);
            } else {
                collapsePanel(collapseIcon, content);
            }

            if (changePanelVisibilityCallback && typeof changePanelVisibilityCallback === 'function') {
                changePanelVisibilityCallback(panelId, !collapsed);
            }
        });
    });

    registerCustomElement('cordova-dialog', function () {
        this.shadowRoot.querySelector('.cordova-header span').textContent = this.getAttribute('caption');
        this.shadowRoot.querySelector('.cordova-close-icon').addEventListener('click', function () {
            dialog.hideDialog();
        });
    });

    registerCustomElement('cordova-item-list', {
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
    }, function () {
        this.classList.add('cordova-group');
    });

    registerCustomElement('cordova-item', function () {
        this.classList.add('cordova-group');
        this.addEventListener('click', function (e) {
            if (e.target === this) {
                // If the click target is our self, the only thing that could have been clicked is the delete icon.
                var list = this.parentNode;

                // If we're within a list, calculate index in the list
                var childIndex = list && list.tagName === 'CORDOVA-ITEM-LIST' ? Array.prototype.indexOf.call(list.children, this) : -1;

                // Raise an event on ourselves
                var itemRemovedEvent = new CustomEvent('itemremoved', { detail: { itemIndex: childIndex }, bubbles: true });
                this.dispatchEvent(itemRemovedEvent);

                list.removeChild(this);
            }
        });
    });

    registerCustomElement('cordova-panel-row', function () {
        this.classList.add('cordova-panel-row');
        this.classList.add('cordova-group');
    });

    registerCustomElement('cordova-group', function () {
        this.classList.add('cordova-group');
    });

    registerCustomElement('cordova-checkbox', {
        checked: {
            get: function () {
                return this.shadowRoot.getElementById('cordova-checkbox-template-input').checked;
            },
            set: function (value) {
                setValueSafely(this.shadowRoot.getElementById('cordova-checkbox-template-input'), 'checked', value);
            }
        }
    }, function () {
        if (this.parentNode.tagName === 'CORDOVA-PANEL') {
            this.classList.add('cordova-panel-row');
            this.classList.add('cordova-group');
        } else {
            // Reverse the order of the checkbox and caption
            this.shadowRoot.appendChild(this.shadowRoot.querySelector('label'));
        }
    });

    registerCustomElement('cordova-radio', {
        checked: {
            get: function () {
                return this.shadowRoot.getElementById('cordova-radio-template-input').checked;
            },
            set: function (value) {
                setValueSafely(this.shadowRoot.getElementById('cordova-radio-template-input'), 'checked', value);
            }
        }
    }, function () {
        var isChecked = this.getAttribute('checked');
        if (isChecked && isChecked.toLowerCase() === 'true') {
            this.shadowRoot.querySelector('input').checked = true;
        }

        var parentGroup = findParent(this, 'cordova-group');
        if (parentGroup) {
            var radioButton = this.shadowRoot.getElementById('cordova-radio-template-input');
            radioButton.setAttribute('name', parentGroup.id);
        }
    });

    registerCustomElement('cordova-label', {
        value: {
            set: function (value) {
                setValueSafely(this.shadowRoot.querySelector('label'), 'textContent', value);
            },
            get: function () {
                return this.shadowRoot.querySelector('label').textContent;
            }
        }
    }, function () {
        this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
    });

    registerCustomElement('cordova-text-entry', {
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
        }
    }, function () {
        this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
        this.classList.add('cordova-panel-row');
        this.classList.add('cordova-group');
    }, 'input');

    registerCustomElement('cordova-number-entry', {
        value: {
            set: function (value) {
                this._internalValue = value;
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
        }
    }, function () {
        this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
        this.classList.add('cordova-panel-row');
        this.classList.add('cordova-group');

        var input = this.shadowRoot.querySelector('input');

        var maxValue = this.getAttribute('max'),
            minValue = this.getAttribute('min'),
            step = this.getAttribute('step');

        if (maxValue !== null) {
            input.setAttribute('max', maxValue);
        }

        if (minValue !== null) {
            input.setAttribute('min', minValue);
        }

        if (step !== null) {
            input.setAttribute('step', step);
        }

        // verify and force the input value to be a valid number
        input.addEventListener('input', function (event) {
            var value = event.target.value;

            if (value.match(/-?(\d+|\d+\.\d+|\.\d+)([eE][-+]?\d+)?/)) {
                this._internalValue = value;
            } else {
                // the new value is not a number, set the value to the
                // latest number value
                input.value = this._internalValue;
                return false;
            }
        }.bind(this));
    }, 'input');

    registerCustomElement('cordova-labeled-value', {
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
    }, function () {
        this.shadowRoot.querySelector('label').textContent = this.getAttribute('label');
        this.shadowRoot.querySelector('span').textContent = this.getAttribute('value');
        this.classList.add('cordova-panel-row');
        this.classList.add('cordova-group');
    });

    registerCustomElement('cordova-button', 'button');

    registerCustomElement('cordova-file', {
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
    }, 'input');

    registerCustomElement('cordova-combo', {
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
        }
    }, function () {
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
    }, 'select');
}

function registerCustomElement(name) {
    var args = arguments;
    function findArg(argType) {
        return Array.prototype.find.call(args, function (arg, index) {
            return index > 0 && (typeof arg === argType);
        });
    }

    var protoProperties = findArg('object');
    var initializeCallback = findArg('function');
    var eventTargetSelector = findArg('string');

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

        if (initializeCallback && this.ownerDocument === document) {
            // If it is being created in the main document, initialize immediately.
            initialize.call(this);
        }
    };

    window[constructorName] = document.registerElement(name, {
        prototype: proto
    });
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
