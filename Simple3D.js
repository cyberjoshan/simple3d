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
        "vshader", "fshader",
        // The vertex attribute names used by the shaders.
        // The order they appear here corresponds to their index
        // used later.
        [ "vNormal", "vColor", "vPosition"],
        // The clear color and depth values
        [ 0, 0, 0.5, 1 ], 10000);

    // Set some uniform variables for the shaders
    this.gl.uniform3f(this.gl.getUniformLocation(this.program, "lightDir"), 0, 0, 1);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "sampler2d"), 0);

    this.canvas = document.getElementById(canvasid);

	this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	this.perspectiveMatrix = new J3DIMatrix4();
	this.perspectiveMatrix.perspective(30, this.canvas.width / this.canvas.height, 1, 10000);
	//this.perspectiveMatrix.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);

	this.meshes = [];
}


Simple3D.prototype.addCamera = function()
{
	this.camera = {};
	this.camera.matrix = new J3DIMatrix4();
	return this.camera;
}

Simple3D.prototype.addLight = function()
{
	this.light = {};
	this.light.matrix = new J3DIMatrix4();
	return this.light;
}

Simple3D.prototype.addBox = function()
{
	var box = { };
	// Create a box. On return 'gl' contains a 'box' property with
	// the BufferObjects containing the arrays for vertices,
	// normals, texture coords, and indices.
	box.buffer = makeBox(gl);

	// Load an image to use. Returns a WebGLTexture object
	box.spiritTexture = loadImageTexture(gl, "spirit.jpg");

	// Create some matrices to use later and save their locations in the shaders
	box.matrix = new J3DIMatrix4();
	box.u_normalMatrixLoc = this.gl.getUniformLocation(this.program, "u_normalMatrix");
	box.u_modelViewProjMatrixLoc =
		    this.gl.getUniformLocation(this.program, "u_modelViewProjMatrix");

	this.meshes.push(box);

	return box;
}

Simple3D.prototype.render = function()
{
	var gl = this.gl;
	// Clear the canvas
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var worldToCameraMatrix = new J3DIMatrix4(this.camera.matrix);
	worldToCameraMatrix.invert();

	for (var i = 0; i < this.meshes.length; i++)
	{
		var mesh = this.meshes[i];
		var buffer = mesh.buffer;
		// Enable all of the vertex attribute arrays.
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);

		// Set up all the vertex attributes for vertices, normals and texCoords
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertexObject);
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normalObject);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.texCoordObject);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

		// Bind the index array

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indexObject);
		// Construct the normal matrix from the model-view matrix and pass it in
		var mvMatrix = new J3DIMatrix4(worldToCameraMatrix);
		mvMatrix.multiply(mesh.matrix);
		var normalMatrix = new J3DIMatrix4(mvMatrix);
		normalMatrix.invert();
		normalMatrix.transpose();
		normalMatrix.setUniform(gl, mesh.u_normalMatrixLoc, false);

		// Construct the model-view * projection matrix and pass it in
		var mvpMatrix = new J3DIMatrix4(this.perspectiveMatrix);
		mvpMatrix.multiply(mvMatrix);
		mvpMatrix.setUniform(gl, mesh.u_modelViewProjMatrixLoc, false);

		// Bind the texture to use
		gl.bindTexture(gl.TEXTURE_2D, mesh.spiritTexture);

		// Draw the cube
		gl.drawElements(gl.TRIANGLES, buffer.numIndices, gl.UNSIGNED_BYTE, 0);
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

