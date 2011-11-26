// ----------------------------------------------------------------
// Simple3D
// ----------------------------------------------------------------

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
}

Model.prototype.setTexture = function(texture)
{
	this.texture = loadImageTexture(this.gl, texture);
}


Simple3D = function(canvasid)
{
    // Initialize
    this.gl = initWebGL(
        // The id of the Canvas Element
        canvasid);
    if (!this.gl) {
      return NULL;
    }
    this.program = simpleSetup(
        gl,
        // The ids of the vertex and fragment shaders
        vshader, fshader,
        // The vertex attribute names used by the shaders.
        // The order they appear here corresponds to their index
        // used later.
        [ "vNormal", "vColor", "vPosition"],
        // The clear color and depth values
        [ 0, 0, 0.5, 1 ], 10000, true);

    // Set some uniform variables for the shaders
    this.gl.uniform4f(this.gl.getUniformLocation(this.program, "Light"), -1, -1, -1, 0);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "sampler2d"), 0);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "Shininess"), 1.0);

    this.canvas = document.getElementById(canvasid);

	this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	this.perspectiveMatrix = new J3DIMatrix4();
	this.perspectiveMatrix.perspective(50, this.canvas.width / this.canvas.height, 1, 10000);

	this.models = [];
}

Simple3D.prototype.addCamera = function()
{
	if (this.camera != undefined)
		log("Simple3D: Only one camera is currently supported. Replacing camera.");
	this.camera = {};
	this.camera.matrix = new J3DIMatrix4();
	return this.camera;
}

Simple3D.prototype.addLight = function()
{
	if (this.light != undefined)
		log("Simple3D: Only one light is currently supported. Replacing light.");
	this.light = {};
	this.light.matrix = new J3DIMatrix4();
	return this.light;
}

Simple3D.prototype.addBox = function()
{
	var box = new Model(gl);
	// Create a box. On return 'gl' contains a 'box' property with
	// the BufferObjects containing the arrays for vertices,
	// normals, texture coords, and indices.
	box.mesh = makeBox(gl);

	// Create some matrices to use later and save their locations in the shaders
	box.matrix = new J3DIMatrix4();

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

	// Create some matrices to use later and save their locations in the shaders
	sphere.matrix = new J3DIMatrix4();

	sphere.colorAmbient = [0.0, 0.0, 0.0, 1.0];
	sphere.colorDiffuse = [1.0, 1.0, 1.0, 1.0];
	sphere.colorSpecular = [0.0, 0.0, 0.0, 1.0];

	this.models.push(sphere);

	return sphere;
}


Simple3D.prototype.render = function()
{
	var gl = this.gl;
	// Clear the canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (this.camera == undefined)
	{
		log("Simple3D: No camera.");
		return;
	}

	var worldToCameraMatrix = new J3DIMatrix4(this.camera.matrix);
	worldToCameraMatrix.invert();

	var colorAmbientLoc = gl.getUniformLocation(this.program, "ColorAmbient");
	var colorDiffuseLoc = gl.getUniformLocation(this.program, "ColorDiffuse");
	var colorSpecularLoc = gl.getUniformLocation(this.program, "ColorSpecular");
	var u_normalMatrixLoc = gl.getUniformLocation(this.program, "MatNormal");
	var u_modelViewMatrixLoc = gl.getUniformLocation(this.program, "MatModelView");
	var u_modelViewProjMatrixLoc = gl.getUniformLocation(this.program, "MatModelViewProjection");
	var u_hasTexture = gl.getUniformLocation(this.program, "HasTexture");

	for (var i = 0; i < this.models.length; i++)
	{
		var model = this.models[i];
		var mesh = model.mesh;
		// Enable all of the vertex attribute arrays.
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);

		// Set up all the vertex attributes for vertices, normals and texCoords
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexObject);
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalObject);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordObject);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

		gl.uniform4fv(colorAmbientLoc, model.colorAmbient);
		gl.uniform4fv(colorDiffuseLoc, model.colorDiffuse);
		gl.uniform4fv(colorSpecularLoc, model.colorSpecular);

		// Bind the index array
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexObject);
		
		var mvMatrix = new J3DIMatrix4(worldToCameraMatrix);
		mvMatrix.multiply(model.matrix);
		mvMatrix.setUniform(gl, u_modelViewMatrixLoc, false);

		// Construct the normal matrix from the model-view matrix and pass it in
		var normalMatrix = new J3DIMatrix4(mvMatrix);
		normalMatrix.invert();
		normalMatrix.transpose();
		normalMatrix.setUniform(gl, u_normalMatrixLoc, false);

		// Construct the model-view * projection matrix and pass it in
		var mvpMatrix = new J3DIMatrix4(this.perspectiveMatrix);
		mvpMatrix.multiply(mvMatrix);
		mvpMatrix.setUniform(gl, u_modelViewProjMatrixLoc, false);

		// Bind the texture to use
		if (model.texture != undefined)
		{
			gl.bindTexture(gl.TEXTURE_2D, model.texture);
			gl.uniform1i(u_hasTexture, 1);	
		}
		else
		{
			gl.uniform1i(u_hasTexture, 0);
		}

		// Draw the cube
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

