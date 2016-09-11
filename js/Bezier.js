var Bezier = function() {
	var self = this;
	var points = [];
	var round = 5;
	var animationDuration = 300;
	var animationFps = 100;
	var animationCurve = 'ease';
	var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	var path = document.createElementNS(svg.namespaceURI, 'path');
	var drawOnChange = true;
	var animateOnChange = false;

	var animationCurves = {
		linear: function(time, duration){return time/duration;},
		easeOut: function(time, duration){return 1-pow((duration-time)/duration, 2);},
		easeIn: function(time, duration){return pow(time/duration, 2);},
		ease: function(time, duration){return time/duration < 0.5 ? pow(time/(duration/2), 2)/2 : 1-pow((duration-time)/(duration/2), 2)/2;}
	};

	svg.appendChild(path);

	var f = function(n) {
		if(typeof f.s[n] != 'undefined') return f.s[n];
		var result = f.s[f.i-1];
		for(f.i; f.i <= n; f.i++) f.s[f.i] = result = result.multiply(f.i.toString());
		return result;
	};
	f.s = [new BigNumber('1'), new BigNumber('1')];
	f.i = 2;

	var c = function(n, k) {
		return f(n)/(f(k)*f(n-k));
	};

	var pow = function(x, n) {
		return Math.pow(x, n);
	};

	var r = function(x, r) {
		r = parseInt(r);
		var p10 = pow(10, isNaN(r) ? self.round : r);
		return Math.round(x*p10)/p10;
	};

	var clone = function(object) {
		return JSON.parse(JSON.stringify(object));
	};

	var update = function(was) {
		if(self.drawOnChange) {
			if(self.animateOnChange && Array.isArray(was)) {
				self.animate({
					'0%': was,
					'100%': clone(self.points)
				});
			}
			else self.draw();
		}
	};

	this.add = function(x, y) {
		if(Array.isArray(x)) {
			var result = [];
			for(var i = 0; i < x.length; i++) {
				var p = this.add(x[i]);
				if(p !== false) result.push(p);
			}
			return result.length == 0 && x.length > 0 ? false : result;
		}
		else {
			if(typeof x == 'object' && x !== null) {
				y = x.y;
				x = x.x;
			}

			x = parseFloat(x);
			y = parseFloat(y);

			if(!isNaN(x) && !isNaN(y)) {
				var point = {
					get x(){return x;},
					set x(v) {
						v = parseFloat(v);
						var was = clone(self.points);
						if(!isNaN(v)) {
							x = v;
							update(was);
						}
					},
					get y(){return y;},
					set y(v) {
						v = parseFloat(v);
						var was = clone(self.points);
						if(!isNaN(v)) {
							y = v;
							update(was);
						}
					}
				};
				points.push(point);
				this.draw();
				return point;
			}
			else return false;
		}
	};

	this.compute = function(t, round) {
		var points = this.points;
		var n = points.length-1;
		if(n > 0) {
			var at = 1-t;
			var point = {x: 0, y: 0};

			for(var i = 0; i <= n; i++) {
				var p = points[i];
				var k = c(n, i)*pow(at, n-i)*pow(t, i);
				point.x += k*p.x;
				point.y += k*p.y;
			}

			return {
				x: r(point.x, round),
				y: r(point.y, round),
			};
		}
		else return {
			x: 0,
			y: 0
		};
	};

	this.each = function(callback, step, round) {
		if(typeof callback == 'function') {
			step = parseFloat(step);
			if(isNaN(step)) step = 1/this.path.getTotalLength();
			for(var t = 0; t <= 1; t += step) callback(this.compute(t, round), t);
			callback(this.compute(1, round), 1);
		}
	};

	this.draw = function() {
		var d = 'M';
		this.each(function(point) {
			d += point.x+' '+point.y+' L';
		});
		d = d.substr(0, d.length-2);

		this.path.setAttribute('d', d);
	};

	this.animate = function(keyframes, duration, curve, fps) {
		if(typeof keyframes == 'object' && keyframes !== null) {
			duration = parseInt(duration);
			duration = isNaN(duration) ? this.animationDuration : duration;

			curve = typeof animationCurves[curve] == 'function' ? animationCurves[curve] : animationCurves[this.animationCurve];

			fps = parseInt(fps);
			fps = isNaN(fps) ? this.animationFps : fps;
			var spf = 1000/fps;

			var keys = [];
			for(var progress in keyframes) {
				keys.push({
					progress: parseFloat(progress)/100,
					points: keyframes[progress]
				});
			}
			keyframes = keys;

			keyframes.sort(function(a, b){return a.progress-b.progress;});

			if(keyframes.length == 1) keyframes = [{progress: 0, points: self.points}].concat(keyframes);

			if(keyframes.length >= 1) {
				var requestId;

				var from = keyframes[0];
				var to = keyframes[1];
				var delta = to.progress-from.progress;
				var time = {
					start: 0,
					last: 0,
					current: 0,
					get delta(){return this.current-this.last;},
					init: function() {
						this.start = new Date().getTime();
					},
					updateCurrent: function() {
						this.current = new Date().getTime()-this.start;
					},
					updateLast: function() {
						this.last = this.current;
					}
				};

				var animate = function() {
					time.updateCurrent();
					if(time.delta > spf) {
						var progress = time.current >= duration ? 1 : curve(time.current,duration);

						var p = (progress-from.progress)/delta;
						points = [];
						for(var i = 0; i<to.points.length; i++) {
							var fp = from.points[i];
							var tp = to.points[i];
							self.add(fp.x+(tp.x-fp.x)*p, fp.y+(tp.y-fp.y)*p);
						}

						if(progress >= to.progress) {
							keyframes = keyframes.slice(1);
							if(keyframes.length > 1 && progress < 1) {
								from = keyframes[0];
								to = keyframes[1];
								delta = to.progress-from.progress;
								if(from.points.length > to.points.length) fromPoints = from.points.slice(0, to.points.length);
								else if(from.points.length < to.points.length) {
									lp = from.points.length > 0 ? from.points[from.points.length-1] : {x: 0, y: 0};
									fromPoints = from.points.concat(Array(to.points.length-from.points.length).fill({x: lp.x, y: lp.y}));
								}
							}
							else {
								window.cancelAnimationFrame(requestId);
								return;
							}
						}

					}
					time.updateLast();
					requestId = window.requestAnimationFrame(animate);
				};

				time.init();
				animate();
			}
		}
	};

	Object.defineProperties(this, {
		svg: {
			get: function(){return svg;}
		},
		namespace: {
			get: function(){return svg.namespaceURI;}
		},
		path: {
			get: function(){return path;}
		},
		points: {
			get: function(){return points;},
			set: function(v) {
				var was = clone(this.points);
				points = [];
				if(this.add(v)) update(was);
			}
		},
		step: {
			get: function(){return step;},
			set: function(v) {
				v = parseFloat(v);
				if(!isNaN(v)) {
					step = v;
					update();
				}
			}
		},
		round: {
			get: function(){return round;},
			set: function(v) {
				v = parseInt(v);
				if(!isNaN(v)) {
					round = v;
					update();
				}
			}
		},
		animationDuration: {
			get: function(){return animationDuration;},
			set: function(v) {
				v = parseInt(v);
				if(!isNaN(v)) animationDuration = v;
			}
		},
		animationFps: {
			get: function(){return animationFps;},
			set: function(v) {
				v = parseInt(v);
				if(!isNaN(v)) animationFps = v;
			}
		},
		animationCurve: {
			get: function(){return animationCurve;},
			set: function(v) {
				if(typeof animationsCurves[v] == 'function') animationCurve = v;
			}
		},
		drawOnChange: {
			get: function(){return drawOnChange;},
			set: function(v){drawOnChange = v ? true : false;}
		},
		animateOnChange: {
			get: function(){return animateOnChange;},
			set: function(v){animateOnChange = v ? true : false;}
		}
	});

	this.points = Array.prototype.slice.call(arguments.length == 0 ? [0] : arguments).reduce(function(a, b){return (Array.isArray(a) ? a : [a]).concat((Array.isArray(b) ? b : [b]));});
};
