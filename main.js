let pause = false; //for halting printouts

let vertices = [];
let faces = [];

let camera = {
    forward: [0, 0, 1],
    pos: [0, 0, 0],
}

const WIDTH = 700;
const HEIGHT = 500;

const fov = 90;
const zNear = 0.1;
const zFar = 1000;

const MOVE_SPEED = 0.03;

const ROT_RATE = 0.0001;
let rotation = 0;

function setup() {
    let canvas = createCanvas(WIDTH, HEIGHT);
    canvas.parent("canvas");
    noStroke();
}

function draw() {
    if (!pause) {
        background(172, 182, 189);
        faces.forEach(face => {

            // TODO: TEMP Move the model into view and give 'er a spin
            face = face.map(i => {
                let p = [...vertices[i]];

                // Create transformation matrix
                rotation += ROT_RATE;
                const R = matrixMultiply(xRotMatrix(rotation), zRotMatrix(rotation));
                const T = matrixMultiply(transMatrix(0, 0, 3), R);

                return vTransform(p, T);
            });

            // Skip rendering away-facing triangles
            const normal = getNormal(face);
            if (vDotProduct(normal, vSub(camera.pos, face[0])) < 0) {
                return;
            }

            // Calculate shading relative to camera
            let percentage = 1 - vAngle(normal, vScale(camera.forward, -1)) * 2 / Math.PI;
            fill(percentage * 160 + 50);

            face = face.map(p => {
                // World space -> Camera space -> Projection space
                const P = matrixMultiply(projMatrix(), lookAtMatrix());
                p = vTransform(p, P);

                // Scale to screen
                p[0] = (p[0] + 1) / 2 * WIDTH;
                p[1] = (p[1] + 1) / 2 * HEIGHT;
                return p;
            });

            triangle(face[0][0], face[0][1], face[1][0], face[1][1], face[2][0], face[2][1]);
        });

        actOnHeldKeys();
    }
}

//----------------------FACES---------------------

function getNormal(f) {
    let u = [];
    let v = [];
    for (i = 0; i < 3; i++) {
        u[i] = f[1][i] - f[0][i];
        v[i] = f[2][i] - f[0][i];
    }

    let cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return vNormalize(cross);
}

//---------------------VECTORS--------------------

function vHom(v) {
    return [...v, 1];
}

function vCart(v) {
    return v[3] === 0 ? v.slice(0, 3) : v.slice(0, 3).map(a => a / v[3]);
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

function vCrossProduct(u, v) {
    const n = v.length;
    w = [];
    for (i = 0; i < n; i++) {
        w.push(u[(i + 1) % n] * v[(i + 2) % n] - u[(i + 2) % n] * v[(i + 1) % n])
    }
    return w;
}

function vMagnitude(v) {
    return Math.sqrt(v.reduce((acc, a) => acc + a * a, 0));
}

function vNormalize(v) {
    return vScale(v, 1 / vMagnitude(v))
}

function vAngle(u, v) {
    return Math.acos(vDotProduct(vNormalize(u), vNormalize(v)));
}

function vTransform(v, M) {
    return vCart(M.map(r => vDotProduct(vHom(v), r)));
}

//--------------------MATRICES----------------------

const aspect = HEIGHT / WIDTH;
const fovRad = 1 / Math.tan(fov / 2 * Math.PI / 180);
const farRatio = zFar / (zFar - zNear);

function emptyMatrix() {
    return Array(4).fill().map(() => Array(4).fill(0));
}

function identityMatrix() {
    const M = emptyMatrix();
    M[0][0] = 1;
    M[1][1] = 1;
    M[2][2] = 1;
    M[3][3] = 1;
    return M;
}

function projMatrix() {
    const M = emptyMatrix();
    M[0][0] = fovRad * aspect;
    M[1][1] = fovRad;
    M[2][2] = farRatio;
    M[2][3] = -farRatio * zNear;
    M[3][2] = 1;
    return M;
}

function transMatrix(x, y, z) {
    const M = identityMatrix();
    M[0][3] = x;
    M[1][3] = y;
    M[2][3] = z;
    return M;
}

function xRotMatrix(a) {
    const M = identityMatrix();
    M[1][1] = Math.cos(a);
    M[1][2] = -Math.sin(a);
    M[2][1] = Math.sin(a);
    M[2][2] = Math.cos(a);
    return M;
}

function yRotMatrix(a) {
    const M = identityMatrix();
    M[0][0] = Math.cos(a);
    M[0][2] = Math.sin(a);
    M[2][0] = -Math.sin(a);
    M[2][2] = Math.cos(a);
    return M;
}

function zRotMatrix(a) {
    const M = identityMatrix();
    M[0][0] = Math.cos(a);
    M[0][1] = -Math.sin(a);
    M[1][0] = Math.sin(a);
    M[1][1] = Math.cos(a);
    return M;
}

function lookAtMatrix() {
    let a = vAngle([0, 0, 1], camera.forward);
    if (vDotProduct([0, 0, 1], vCrossProduct([0, 1, 0], camera.forward)) > 0) {
        a = -a;
    }
    return matrixMultiply(yRotMatrix(-a), transMatrix(...vScale(camera.pos, -1)))
}

function transpose(M) {
    let N = emptyMatrix();
    for (i = 0; i < 4; i++) {
        for (j = 0; j < 4; j++) {
            N[i][j] = M[j][i];
        }
    }
    return N;
}

function matrixMultiply(M, N) {
    const NT = transpose(N);
    return M.map(r => NT.map(c => vDotProduct(r, c)));
}

//--------------------KEY INPUT---------------------

let heldKey = { x: "none", y: "none" };

function actOnHeldKeys() {
    if (heldKey.y === "up") {
        camera.pos = vAdd(camera.pos, vScale(camera.forward, MOVE_SPEED))
    } else if (heldKey.y === "down") {
        camera.pos = vAdd(camera.pos, vScale(camera.forward, -MOVE_SPEED))
    }

    if (heldKey.x === "left") {
        camera.forward = vTransform(camera.forward, yRotMatrix(-MOVE_SPEED))
    } else if (heldKey.x === "right") {
        camera.forward = vTransform(camera.forward, yRotMatrix(MOVE_SPEED))
    }
}

function keyPressed() {
    if (keyCode === UP_ARROW || key === "w") {
        heldKey.y = "up";
    } else if (keyCode === DOWN_ARROW || key === "s") {
        heldKey.y = "down";
    } else if (keyCode === LEFT_ARROW || key === "a") {
        heldKey.x = "left";
    } else if (keyCode === RIGHT_ARROW || key === "d") {
        heldKey.x = "right";
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

//--------------------FILE PARSING---------------------

function parseObj(result) {
    vertices = [];
    faces = [];

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