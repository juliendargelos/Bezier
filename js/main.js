var graph = {
	element: document.getElementsByTagName('main')[0],
	curve: new Bezier,
	controls: [],
	moving: null,
	get svg(){return this.curve.svg;},
	get width(){return this.element.offsetWidth;},
	get height(){return this.element.offsetHeight;},
	set scale(v) {
		if(v > 1) v = 1;
		this.svg.setAttribute('style','transform: scale('+v+');');
	},
	control: function(x, y) {
		var self = this;

		var length = this.controls.length;
		var point = this.curve.add(x, y);
		if(point != false) {
			var control = {
				circle: document.createElementNS(this.svg.namespaceURI, 'circle'),
				line: document.createElementNS(this.svg.namespaceURI, 'line'),
				init: {x: 0, y: 0, relative: false},
				offset: this.controls.length,
				point: point
			};

			control.circle.setAttribute('r', 5);

			control.circle.addEventListener('mousedown', function(event) {
				control.init = {
					x: event.clientX-control.point.x,
					y: event.clientY-control.point.y,
				};
				self.moving = control;
			});

			control.circle.addEventListener('dblclick', function(event) {
				control.remove();
				event.stopPropagation();
			});

			control.update = function() {
				this.circle.setAttribute('cx', this.point.x);
				this.circle.setAttribute('cy', this.point.y);
				if(this.offset+1<self.controls.length) {
					if(!this.line.parentNode) self.svg.insertBefore(this.line, self.svg.firstChild);

					var p = self.controls[this.offset+1].point;

					this.line.setAttribute('x1', this.point.x);
					this.line.setAttribute('y1', this.point.y);
					this.line.setAttribute('x2', p.x);
					this.line.setAttribute('y2', p.y);
				}
				else if(this.line.parentNode) this.line.parentNode.removeChild(this.line);
				if(this.offset>0) {
					self.controls[this.offset-1].update();
				}
			};

			control.remove = function() {
				if(this.circle.parentNode) this.circle.parentNode.removeChild(this.circle);
				if(this.line.parentNode) this.line.parentNode.removeChild(this.line);
				self.controls = self.controls.slice(0,this.offset).concat(self.controls.slice(this.offset+1));
				for(var i = control.offset; i < self.controls.length; i++) self.controls[i].offset = i;
				self.curve.points = self.controls.map(function(control){return control.point;});
				for(var i = 0; i<self.curve.points.length; i++) self.controls[i].point = self.curve.points[i];
				self.update();
			};

			this.svg.appendChild(control.circle);
			this.controls.push(control);
			control.update();
		}
	},
	update: function() {
		for(var i = 0; i < this.controls.length; i++) this.controls[i].update();
	},
	init: function() {
		var self = this;

		window.addEventListener('mousemove', function(event) {
			if(self.moving !== null) {
				var control = self.moving;
				control.point.x = event.clientX - control.init.x;
				control.point.y = event.clientY - control.init.y;

				control.update();
			}
		});

		window.addEventListener('mouseup', function() {
			self.moving = null;
		});

		this.element.addEventListener('dblclick', function(event) {
			self.control(event.clientX, event.clientY);
		});

		this.control(this.width/2-100, this.height/2+100);
		this.control(this.width/2-100, this.height/2-50);
		this.control(this.width/2+100, this.height/2+50);
		this.control(this.width/2+100, this.height/2-100);

		this.update();

		this.element.appendChild(this.svg);
	}
};

graph.init();
