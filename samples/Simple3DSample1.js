var S3D;
var box1;
var box2;

var t;

function update(dt)
{
	t += dt;
	box1.matrix.makeIdentity();
	box1.matrix.translate([-Math.sin(t) - 3.0, 0.0, 0.0]);
	box1.matrix.rotate(t * 50, [0.0, 1.0, 0.0]);
	box2.matrix.makeIdentity();
	box2.matrix.translate([Math.sin(t) + 3.0, 0.0, 0.0]);
	box2.matrix.rotate(t * 50, [0.0, 1.0, 0.0]);
}

function main()
{
	t = 0;
	S3D = new Simple3D('canvas');
	box1 = S3D.addBox();
	box1.colorDiffuse = [ 1.0, 1.0, 1.0, 1.0 ];
	box2 = S3D.addSphere(8);
	box2.colorDiffuse = [ 1.0, 1.0, 0.0, 1.0 ];
	var light = S3D.addLight();
	light.matrix.translate(0, 10, -10);
	var camera = S3D.addCamera();
	camera.matrix.translate(0, 0, 20);
	S3D.run(update);
}

main();

