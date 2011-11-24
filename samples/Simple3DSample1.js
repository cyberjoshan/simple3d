var S3D;
var box1;
var box2;

var t;

function update(dt)
{
	t += dt;
	box1.matrix.translate(Math.sin(t) * -0.1);
	box2.matrix.translate(Math.sin(t) *  0.1);
}

function main()
{
	t = 0;
	S3D = new Simple3D('canvas');
	box1 = S3D.addBox();
	box1.matrix.translate(-1.5, 0, 0);
	box2 = S3D.addBox();
	box2.matrix.translate(1.5, 0, 0);
	var light = S3D.addLight();
	light.matrix.translate(0, 10, -10);
	var camera = S3D.addCamera();
	camera.matrix.translate(0, 0, 50);
	S3D.run(update);
}

main();

