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
	this.perspectiveMatrix = mat4.perspective(45, this.canvas.width / this.canvas.height, 1, 10000);

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

