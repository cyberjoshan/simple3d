// -----------------------------------------------------------------------
// Simple3D
// -----------------------------------------------------------------------

/*
Copyright (c) 2011 Eduardo Poyart.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

var vshader = "\n\
attribute vec4 vPosition; \n\
attribute vec3 vNormal; \n\
attribute vec2 vTexCoord; \n\
varying vec4 color; \n\
varying vec2 texCoord; \n\
\n\
uniform vec4 ColorAmbient; \n\
uniform vec4 ColorDiffuse; \n\
uniform vec4 ColorSpecular; \n\
uniform mat4 MatModelView; \n\
uniform mat4 MatModelViewProjection; \n\
uniform mat4 MatNormal; \n\
uniform vec4 Light; \n\
uniform float Shininess; \n\
\n\
void main() \n\
{ \n\
	// Transform vertex position into eye coordinates \n\
	vec3 pos = (MatModelView * vPosition).xyz; \n\
	\n\
	vec3 L = Light.xyz - pos; \n\
	if (Light.w == 0.0) \n\
		L = -Light.xyz; \n\
	L = normalize(L); \n\
	vec3 E = normalize(-pos); \n\
	vec3 H = normalize(L + E); \n\
	\n\
	// Transform vertex normal into eye coordinates \n\
	vec3 N = normalize((MatNormal * vec4(vNormal, 0.0)).xyz); \n\
	\n\
	// Compute terms in the illumination equation \n\
	vec3 ambient = ColorAmbient.xyz; \n\
	\n\
	float Kd = max(dot(L, N), 0.0); \n\
	vec3 diffuse = Kd * ColorDiffuse.xyz; \n\
	\n\
	float Ks = pow(max(dot(N, H), 0.0), Shininess); \n\
	vec3 specular = Ks * ColorSpecular.xyz; \n\
	\n\
	//if(dot(L, N) < 0.0) \n\
	//	specular = vec4(0.0, 0.0, 0.0, 0.0); \n\
	\n\
	gl_Position = MatModelViewProjection * vPosition; \n\
	\n\
	color = vec4(ambient + diffuse + specular, ColorDiffuse.w); \n\
	texCoord = vec2(vTexCoord.x, 1.0-vTexCoord.y); \n\
} \n\
";

var fshader = "\
	precision mediump float; \n\
\n\
	uniform sampler2D sampler2d; \n\
	uniform int HasTexture; \n\
	varying vec4 color; \n\
	varying vec2 texCoord; \n\
\n\
	void main() \n\
	{ \n\
		if (HasTexture != 0) \n\
		{ \n\
			vec4 texcolor = texture2D(sampler2d, texCoord); \n\
			gl_FragColor.xyz = color.xyz * texcolor.xyz; \n\
			gl_FragColor.w = 1.0 - ((1.0 - color.w) * (1.0 - texcolor.w)); \n\
		} \n\
		else \n\
		{ \n\
			gl_FragColor = color; \n\
		} \n\
	} \n\
";

Model = function(gl)
{
	this.gl = gl;
	this.matrix = mat4.identity();
    this.pickRadius = 0;
}

Model.prototype.setTexture = function(texture)
{
	this.texture = loadImageTexture(this.gl, texture);
}

Model.prototype.getPosition = function()
{
	return vec3.create([this.matrix[12], this.matrix[13], this.matrix[14]]); 
}

Model.prototype.setPosition = function(v)
{
	this.matrix[12] = v[0];
	this.matrix[13] = v[1];
	this.matrix[14] = v[2];
}

Model.prototype.getOrientation = function()
{
	return mat4.toRotationMat(this.matrix); 
}

Model.prototype.setOrientation = function(m)
{
	this.matrix[0] = m[0]; this.matrix[1] = m[1]; this.matrix[2]  = m[2];
	this.matrix[4] = m[3]; this.matrix[5] = m[4]; this.matrix[6]  = m[5];
	this.matrix[8] = m[6]; this.matrix[9] = m[7]; this.matrix[10] = m[8];
}

Model.prototype.setVertex = function(idx, v)
{
	var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexObject);
	this.mesh.vertices[idx*3  ] = v[0];
	this.mesh.vertices[idx*3+1] = v[1];
	this.mesh.vertices[idx*3+2] = v[2];
    gl.bufferData(gl.ARRAY_BUFFER, this.mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

Model.prototype.setVertices = function(idx1, v)
{
	var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexObject);
    var idx2 = idx1 + v.length;
    for (var i = idx1; i < idx2; i++)
    {
		this.mesh.vertices[i*3  ] = v[i][0];
		this.mesh.vertices[i*3+1] = v[i][1];
		this.mesh.vertices[i*3+2] = v[i][2];
	}
    gl.bufferData(gl.ARRAY_BUFFER, this.mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

Simple3D = function(canvasid)
{
	this.gl = initWebGL(canvasid);
	if (!this.gl)
		return NULL;
	this.program = simpleSetup(
		gl, vshader, fshader,
		// The vertex attribute names used by the shaders.
		// The order they appear here corresponds to their index
		// used later.
		[ "vNormal", "vColor", "vPosition"],
		// The clear color and depth values
		[ 0, 0, 0, 1 ], 10000, true);

	this.gl.uniform1i(this.gl.getUniformLocation(this.program, "sampler2d"), 0);
	this.gl.uniform1f(this.gl.getUniformLocation(this.program, "Shininess"), 1.0);

	this.canvas = document.getElementById(canvasid);

	this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	this.perspectiveMatrix = mat4.perspective(40, this.canvas.width / this.canvas.height, 0.1, 10000);

	this.models = [];
}

Simple3D.prototype.setClearColor = function(c)
{
	this.gl.clearColor(c[0], c[1], c[2], c[3]);
}

Simple3D.prototype.addCamera = function()
{
	if (this.camera != undefined)
		log("Simple3D: Only one camera is currently supported. Replacing camera.");
	this.camera = new Model();
	return this.camera;
}

Simple3D.prototype.getCamera = function()
{
	return this.camera;
}

Simple3D.prototype.addLight = function()
{
	if (this.light != undefined)
		log("Simple3D: Only one light is currently supported. Replacing light.");
	this.light = new Model();
	return this.light;
}

Simple3D.prototype.addBox = function()
{
	var box = new Model(gl);
	box.mesh = makeBox(gl);
	
	box.colorAmbient = [0.0, 0.0, 0.0, 1.0];
	box.colorDiffuse = [1.0, 1.0, 1.0, 1.0];
	box.colorSpecular = [0.0, 0.0, 0.0, 1.0];

	this.models.push(box);

	return box;
}

Simple3D.prototype.addSphere = function(num_segments)
{
	var sphere = new Model(gl);
	sphere.mesh = makeSphere(gl, 1.0, num_segments, 2*num_segments);
	
	sphere.colorAmbient = [0.0, 0.0, 0.0, 1.0];
	sphere.colorDiffuse = [1.0, 1.0, 1.0, 1.0];
	sphere.colorSpecular = [0.0, 0.0, 0.0, 1.0];

	this.models.push(sphere);

	return sphere;
}

function setBuffers(gl, model, vertices, normals, texCoords, indices)
{
	model.mesh = {};
	model.mesh.vertices = vertices;

	model.mesh.normalObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.normalObject);
	gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

	model.mesh.texCoordObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.texCoordObject);
	gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

	model.mesh.vertexObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexObject);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	model.mesh.indexObject = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	model.mesh.numIndices = indices.length;
}


Simple3D.prototype.addQuadXY = function()
{
	var gl = this.gl;
	var quad = new Model(gl);
	var vertices = new Float32Array(
		[  -1,-1, 0,   1,-1, 0,   1, 1, 0,  -1, 1, 0 ] );

	var normals = new Float32Array(
		[   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1 ] );

	var texCoords = new Float32Array(
		[  0, 0,   1, 0,   1, 1,   0, 1 ] );

	// index array
	var indices = new Uint16Array(
		[  0, 1, 2,   0, 2, 3 ] );

	setBuffers(gl, quad, vertices, normals, texCoords, indices);
	
	quad.colorAmbient = [0.0, 0.0, 0.0, 1.0];
	quad.colorDiffuse = [1.0, 1.0, 1.0, 1.0];
	quad.colorSpecular = [0.0, 0.0, 0.0, 1.0];

	this.models.push(quad);

	return quad;
}

Simple3D.prototype.addTriangleXY = function()
{
	var gl = this.gl;
	var tri = new Model(gl);
	var vertices = new Float32Array(
		[  -1,-1, 0,   1,-1, 0,   0, 1, 0 ] );

	var normals = new Float32Array(
		[   0, 0, 1,   0, 0, 1,   0, 0, 1 ] );

	var texCoords = new Float32Array(
		[  0, 0,   1, 0,   0.5, 1  ] );

	// index array
	var indices = new Uint16Array(
		[  0, 1, 2 ] );

	setBuffers(gl, tri, vertices, normals, texCoords, indices);
	
	tri.colorAmbient = [0.0, 0.0, 0.0, 1.0];
	tri.colorDiffuse = [1.0, 1.0, 1.0, 1.0];
	tri.colorSpecular = [0.0, 0.0, 0.0, 1.0];

	this.models.push(tri);

	return tri;
}


Simple3D.prototype.render = function()
{
	var gl = this.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (this.camera == undefined)
	{
		log("Simple3D: No camera.");
		return;
	}

	var worldToCameraMatrix = mat4.create();
	mat4.inverse(this.camera.matrix, worldToCameraMatrix);

	var colorAmbientLoc = gl.getUniformLocation(this.program, "ColorAmbient");
	var colorDiffuseLoc = gl.getUniformLocation(this.program, "ColorDiffuse");
	var colorSpecularLoc = gl.getUniformLocation(this.program, "ColorSpecular");
	var u_normalMatrixLoc = gl.getUniformLocation(this.program, "MatNormal");
	var u_modelViewMatrixLoc = gl.getUniformLocation(this.program, "MatModelView");
	var u_modelViewProjMatrixLoc = gl.getUniformLocation(this.program, "MatModelViewProjection");
	var u_hasTexture = gl.getUniformLocation(this.program, "HasTexture");

	var lightPos = this.light.getPosition();
	mat4.multiplyVec3(worldToCameraMatrix, lightPos);
	gl.uniform4f(gl.getUniformLocation(this.program, "Light"), lightPos[0], lightPos[1], lightPos[2], 1);

	for (var i = 0; i < this.models.length; i++)
	{
		var model = this.models[i];
		var mesh = model.mesh;
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexObject);
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalObject);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordObject);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

		gl.uniform4fv(colorAmbientLoc, model.colorAmbient);
		gl.uniform4fv(colorDiffuseLoc, model.colorDiffuse);
		gl.uniform4fv(colorSpecularLoc, model.colorSpecular);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexObject);
		
		var mvMatrix = mat4.create();
		mat4.multiply(worldToCameraMatrix, model.matrix, mvMatrix);
		gl.uniformMatrix4fv(u_modelViewMatrixLoc, false, mvMatrix);

		var normalMatrix = mat4.create();
		mat4.inverse(mvMatrix, normalMatrix);
		mat4.transpose(normalMatrix);
		gl.uniformMatrix4fv(u_normalMatrixLoc, false, normalMatrix);

		var mvpMatrix = mat4.create();
		mat4.multiply(this.perspectiveMatrix, mvMatrix, mvpMatrix);
		gl.uniformMatrix4fv(u_modelViewProjMatrixLoc, false, mvpMatrix);

		if (model.texture != undefined)
		{
			gl.bindTexture(gl.TEXTURE_2D, model.texture);
			gl.uniform1i(u_hasTexture, 1);	
		}
		else
		{
			gl.uniform1i(u_hasTexture, 0);
		}

		gl.drawElements(gl.TRIANGLES, mesh.numIndices, gl.UNSIGNED_SHORT, 0);
	}
}

Simple3D.prototype.run = function(updateFunc)
{
	var S3D_ref = this;
	var f = function()
	{
		updateFunc(1.0 / 60.0);
		S3D_ref.render();
		window.requestAnimFrame(f, S3D_ref.canvasid);
	};
	f();
}

Simple3D.prototype.getCanvasPos = function()
{
    var curleft = curtop = 0;
    var obj = this.canvas;

    if (obj.offsetParent) 
    {
        do 
        {
            curleft += obj.offsetLeft - obj.scrollLeft;
            curtop += obj.offsetTop - obj.scrollTop;
        } while (obj = obj.offsetParent);
    }
    return [curleft, curtop];
}

function raySphereIntersection(ray, spherec, spherer)
{
	var lc = vec3.dot(ray, spherec);
	var c2 = vec3.dot(spherec, spherec);
	var r2 = spherer * spherer;
	var det = lc * lc - c2 + r2;
	if (det < 0)
		return [false, 0, 0];
	var sqrtdet = Math.sqrt(det);
	return [true, lc - sqrtdet, lc + sqrtdet];
}

Simple3D.prototype.toNormalizedCoordinates = function(x, y)
{
	var offset = this.getCanvasPos();
	var xx = x - offset[0];
	var yy = this.canvas.height - (y - offset[1]);
	var xn = (2 * xx / this.canvas.width) - 1;
	var yn = (2 * yy / this.canvas.height) - 1;
	return [xn, yn];
}

Simple3D.prototype.pick = function(x, y)
{
	var xn = this.toNormalizedCoordinates(x, y);
	//log(" " + xn[0] + " " + xn[1] + "\n");

	var worldToCameraMatrix = mat4.create();
	mat4.inverse(this.camera.matrix, worldToCameraMatrix);

	var invPerspMatrix = mat4.create();
	mat4.inverse(this.perspectiveMatrix, invPerspMatrix);
	
	var xScreen = vec3.create([xn[0], xn[1], 1]);
	var xCamera = vec3.create();
	mat4.multiplyVec3(invPerspMatrix, xScreen, xCamera);
	vec3.normalize(xCamera);

	//log(" " + xCamera[0] + " " + xCamera[1] + " " + xCamera[2]);
	
	for (var i = 0; i < this.models.length; i++)
	{
		var model = this.models[i];
		if (model.pickRadius > 0)
		{
			var c = model.getPosition();
			mat4.multiplyVec3(worldToCameraMatrix, c);
			var inter = raySphereIntersection(xCamera, c, model.pickRadius);
			if (inter[0])
				return model;
		}
	}
	return undefined;
}

Simple3D.prototype.projectToCamera = function(x, y)
{
	var xn = this.toNormalizedCoordinates(x, y);
	var pn = vec3.create([xn[0], xn[1], 1]);
	var invPerspMatrix = mat4.create();
	mat4.inverse(this.perspectiveMatrix, invPerspMatrix);
	var result = vec3.create();
	mat4.multiplyVec3(invPerspMatrix, pn, result);
	return result;
}

Simple3D.prototype.projectToWorld = function(x, y)
{
	var result = projectToCamera(x, y);
	mat4.multiplyVec3(this.camera.matrix, result);
	return result;
}

