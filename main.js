let pause = false; //for halting printouts

let vertices = [];
let faces = [];

let camera = {
    up: [0, 1, 0],
    forward: [0, 0, 1],
    pos: [0, 0, 0],
}

const WIDTH = 700;
const HEIGHT = 500;

function setup() {
    let canvas = createCanvas(WIDTH, HEIGHT);
    canvas.parent("canvas");
}

function draw() {
    if (!pause) {
        background(155);
        noFill();
        faces.forEach((face, index) => {
            face = face.map(i => {
                let p = [...vertices[i]];

                // Move into view
                p[2] += 3;

                // Project to 2D
                p = vTransform(p, projMatrix);

                // Scale to screen
                p[0] = (p[0] + 1) / 2 * WIDTH;
                p[1] = (p[1] + 1) / 2 * HEIGHT;
                return p;
            });
            triangle(face[0][0], face[0][1], face[1][0], face[1][1], face[2][0], face[2][1]);
        });
    }
}

//-------------------PROJECTION-------------------

const fov = 90;
const zNear = 0.1;
const zFar = 1000;

const aspect = HEIGHT / WIDTH;
const fovRad = 1 / Math.tan(fov / 2 * Math.PI / 180);
const farRatio = zFar / (zFar - zNear);

const projMatrix = [
    [fovRad * aspect, 0, 0, 0],
    [0, fovRad, 0, 0],
    [0, 0, farRatio, -farRatio * zNear],
    [0, 0, 1, 0]
];

//---------------------VECTORS--------------------

function vec(x, y, z) {
    return { x: x, y: y, z: z };
}

function vAdd(u, v) {
    return u.map((_, i) => u[i] + v[i]);
}

function vSub(u, v) {
    return u.map((_, i) => u[i] - v[i]);
}

function vScale(v, c) {
    return v.map(a => a * c);
}

function vDotProduct(u, v) {
    return u.reduce((acc, _, i) => acc + u[i] * v[i], 0);
}

function vMagnitude(v) {
    return Math.sqrt(v.reduce((acc, a) => acc + a * a), 0);
}

function vNormalize(v) {
    return vScale(v, 1 / vMagnitude(v))
}

function vTransform(v, M) {
    let temp = M.map(r => vDotProduct(v, r) + r[3]);
    const w = temp[3];
    return w === 0 ? temp.slice(0, 3) : temp.slice(0, 3).map(a => a / w);
}

function vRotX(v, a) {
    return vTransform(v, [
        [1, 0, 0],
        [0, Math.cos(a), -Math.sin(a)],
        [0, Math.sin(a), Math.cos(a)]
    ]);
}

function vRotY(v, a) {
    return vTransform(v, [
        [Math.cos(a), 0, Math.sin(a)],
        [0, 0, 0],
        [-Math.sin(a), 0, Math.cos(a)]
    ]);
}

function vRotZ(v, a) {
    return vTransform(v, [
        [Math.cos(a), -Math.sin(a), 0],
        [Math.sin(a), Math.cos(a), 0],
        [0, 0, 1]
    ]);
}

//--------------------KEY INPUT---------------------

let heldKey = { x: "none", y: "none" };

function keyPressed() {
    if (keyCode === UP_ARROW || key === "w") {
        heldKey.y = "up";
        camera.pos = vAdd(camera.pos, camera.forward)
    } else if (keyCode === DOWN_ARROW || key === "s") {
        heldKey.y = "down";
        camera.pos = vSub(camera.pos, camera.forward)
    } else if (keyCode === LEFT_ARROW || key === "a") {
        heldKey.x = "left";
        //moveLeft();
    } else if (keyCode === RIGHT_ARROW || key === "d") {
        heldKey.x = "right";
        //moveRight();
    } else if (key === 'p') {
        pause = !pause;
    }
}

function keyReleased() {
    if (keyCode === UP_ARROW || key === "w") {
        heldKey.y = keyIsDown(DOWN_ARROW) || keyIsDown(115) ? "down" : "none";

    } else if (keyCode === DOWN_ARROW || key === "s") {
        heldKey.y = keyIsDown(UP_ARROW) || keyIsDown(119) ? "up" : "none";

    } else if (keyCode === LEFT_ARROW || key === "a") {
        heldKey.x = keyIsDown(RIGHT_ARROW) || keyIsDown(100) ? "right" : "none";

    } else if (keyCode === RIGHT_ARROW || key === "d") {
        heldKey.x = keyIsDown(LEFT_ARROW) || keyIsDown(97) ? "left" : "none";
    }
}



//--------------------MOUSE INPUT---------------------

function mouseClicked() {

}

//--------------------FILE PARSING---------------------

function parseObj(result) {
    let lines = result.split('\n');

    lines.forEach(line => {
        let symbols = line.split(/\s+/g);

        let token = symbols[0];
        symbols = symbols.slice(1);
        if (token === "v") {
            vertices.push(symbols.map(x => +x));
        } else if (token === "f") {
            faces.push(symbols.map(index => index - 1));
        }
    });
}

function readFile(input) {
    let file = input.files[0];
    let reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function() {
        parseObj(reader.result);
    };

    reader.onerror = function() {
        console.log(reader.error);
    };
}