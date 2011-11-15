(function(Raphael) {
  // ## Set.transit(options, [duration], [callback])
  // Moves.
  //
  //   set.transit({
  //     rotate: 30
  //   }, 500);
  //
  Raphael.st.transit = function(options, duration, callback) {
    var cb   = null;
    var self = this;

    if (callback)
      cb = function() { callback.apply(self); };

    this.forEach(function(el, i) {
      el.transit(options, duration, (i === 0) ? cb : null);
    });
  };

  // ## Element.transit(options, [duration], [callback])
  // See Set.transit.
  //
  Raphael.el.transit = function(options, dur, callback) {
    var self = this;

    // Set defaults.
    if (!dur) dur = 400;
    
    // Check out each of the options, and delegate as needed.
    for (prop in options) {
      if (options.hasOwnProperty(prop)) {
        var val = normalize(options[prop]);

        // Delegate to the right transit hook.
        var fn = Raphael.transitHooks[prop] || Raphael.transitHooks._default;
        fn.apply(self, [val, dur]);
      }
    }
    
    if (callback) {
      window.setTimeout(function() {
        callback.apply(self);
      }, dur);
    }
  };

  // ## Transit hooks
  // The available transition properties.
  //
  Raphael.transitHooks = {
    '_default': function(value, dur) {
      animateProperty(this[0], prop, value, dur);
    },

    'rotate':       transitFor('rotate'),
    'translate':    transitFor('translate'),
    'perspective':  transitFor('perspective'),
    'scale':        transitFor('scale'),
    'rotateX':      transitFor('rotateX'),
    'rotateY':      transitFor('rotateY')
  };

  // ## Helpers
  // These are functions that power the functions above.

  // ### animateElement()
  // Creates an animation element.
  //
  //  * `name` -- The name of the element. Usually *animate* or *animateTransform*.
  //  * `target` -- The DOM element.
  //  * `attrs` -- a dict object with the attributes to be set.
  //
  function animateElement(name, target, attrs) {
    // Create the <animate> element to be appended into the SVG element.
    var animation = document.createElementNS(
      'http://www.w3.org/2000/svg', name);

    // Set attributes.
    for (key in attrs) {
      if (attrs.hasOwnProperty(key))
        animation.setAttributeNS(null, key, attrs[key]);
    }

    // Link the animation to the target.
    target.appendChild(animation);
    
    // Remove it later.
    var duration = parseInt(attrs.dur);
    window.setTimeout(function() {
      target.removeChild(animation);
    }, duration);
  };

  // Animates a given property `property` to value `value` for `duration` ms in
  // `target` element.
  function animateProperty(target, property, value, duration) {
    return animateElement('animate', target, {
      attributeName: property,
      to: value,
      dur: duration + 'ms'
    });
  };

  function animateTransform(target, type, value, duration) {
    return animateElement('animateTransform', target, {
      attributeName: 'transform', 
      to: value,
      dur: duration + 'ms',
      type: type,
      additive: 'sum'
    });
  };

  // Returns the value as an array or string, lol.
  function normalize(val) {
    if ((typeof val === 'string') && (val.indexOf(',') > -1))
      return val.split(',');
    else
      return val;
  }

  function transitFor(prop) {
    return function(value, dur) {
      var v = value;
      if (value.constructor === Array) v = v.join(',');
      animateTransform(this[0], prop, value, dur);
    }
  }
})(Raphael);
