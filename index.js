let tg, camera, scene, renderer, controls, stats, particles;
let collectibles = [];
let loader;

let userLevel = 1;
let userExperience = 0;

let gameActive = false;
let gameScore = 0;
let gameTimer = 30;
let gameInterval;

const cryptoData = {
    'Bitcoin': { 
        description: 'Bitcoin is the first decentralized cryptocurrency.',
        color: 0xffa500 // оранжевый
    },
    'Ethereum': { 
        description: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality.',
        color: 0x6dc4ef // голубой
    },
    'Dogecoin': {
        description: 'Dogecoin is a cryptocurrency featuring a Shiba Inu dog as its logo.',
        color: 0xffd700 // золотой
    }
};

function waitForThree() {
    return new Promise(resolve => {
        if (typeof THREE !== 'undefined' && THREE.REVISION) {
            resolve();
        } else {
            setTimeout(() => waitForThree().then(resolve), 100);
        }
    });
}

async function initializeApp() {
    await waitForThree();
    
    tg = window.Telegram.WebApp;
    tg.expand();

    loader = new THREE.GLTFLoader();

    init();
    animate();

    document.getElementById('startGameBtn').addEventListener('click', startMiniGame);
}

function init() {
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 5;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    stats = new Stats();
    document.body.appendChild(stats.dom);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    createStarfield();
    loadCollectibles();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCollectibleClick);

    updateLevelUI();
}

function createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < 10000; i++) {
        vertices.push(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function loadCollectibles() {
    const collectiblesData = [
        { name: 'Bitcoin', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf', position: new THREE.Vector3(-2, 0, 0) },
        { name: 'Ethereum', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf', position: new THREE.Vector3(0, 0, 0) },
        { name: 'Dogecoin', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf', position: new THREE.Vector3(2, 0, 0) },
    ];

    collectiblesData.forEach(data => {
        loader.load(data.url, (gltf) => {
            const model = gltf.scene;
            model.position.copy(data.position);
            model.scale.set(0.5, 0.5, 0.5);
            model.userData.name = data.name;

            const glowMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    c: { type: "f", value: 0.5 },
                    p: { type: "f", value: 2.0 },
                    glowColor: { type: "c", value: new THREE.Color(cryptoData[data.name].color) },
                    viewVector: { type: "v3", value: camera.position }
                },
                vertexShader: `
                    uniform vec3 viewVector;
                    uniform float c;
                    uniform float p;
                    varying float intensity;
                    void main() {
                        vec3 vNormal = normalize( normalMatrix * normal );
                        vec3 vNormel = normalize( normalMatrix * viewVector );
                        intensity = pow( c - dot(vNormal, vNormel), p );
                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    varying float intensity;
                    void main() {
                        vec3 glow = glowColor * intensity;
                        gl_FragColor = vec4( glow, 1.0 );
                    }
                `,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });

            const glowMesh = new THREE.Mesh(model.children[0].geometry.clone(), glowMaterial);
            glowMesh.scale.multiplyScalar(1.1);
            model.add(glowMesh);

            scene.add(model);
            collectibles.push(model);
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onCollectibleClick(event) {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(collectibles, true);

    if (intersects.length > 0) {
        const collectible = intersects[0].object.parent;
        const cryptoName = collectible.userData.name;
        const cryptoInfo = cryptoData[cryptoName];

        document.getElementById('cryptoInfo').innerHTML = `
            <h3>${cryptoName}</h3>
            <p>${cryptoInfo.description}</p>
        `;
        document.getElementById('cryptoInfo').style.display = 'block';

        tg.showPopup({
            title: cryptoName,
            message: `You've collected ${cryptoName}! Learn more about it.`,
            buttons: [{text: "Awesome!"}]
        });

        animateCollection(collectible);
        updateLevelSystem(cryptoName);
    } else {
        document.getElementById('cryptoInfo').style.display = 'none';
    }
}

function animateCollection(collectible) {
    const originalScale = collectible.scale.x;
    const targetScale = originalScale * 1.5;
    const duration = 500; // миллисекунды

    new TWEEN.Tween(collectible.scale)
        .to({ x: targetScale, y: targetScale, z: targetScale }, duration / 2)
        .easing(TWEEN.Easing.Quadratic.Out)
        .chain(new TWEEN.Tween(collectible.scale)
            .to({ x: originalScale, y: originalScale, z: originalScale }, duration / 2)
            .easing(TWEEN.Easing.Quadratic.In))
        .start();
}

function updateLevelSystem(collectedCrypto) {
    userExperience += 10; // Опыт за сбор криптовалюты
    if (userExperience >= userLevel * 100) {
        userLevel++;
        tg.showPopup({
            title: "Level Up!",
            message: `Congratulations! You've reached level ${userLevel}!`,
            buttons: [{text: "Great!"}]
        });
    }
    updateLevelUI();
}

function updateLevelUI() {
    document.getElementById('levelInfo').textContent = `Level: ${userLevel} | XP: ${userExperience}`;
}

function startMiniGame() {
    if (gameActive) return;
    gameActive = true;
    gameScore = 0;
    gameTimer = 30;
    updateGameUI();
    gameInterval = setInterval(updateGame, 1000);
    document.getElementById('gameContainer').style.display = 'block';
}

function updateGame() {
    gameTimer--;
    if (gameTimer <= 0) {
        endGame();
    }
    updateGameUI();
}

function endGame() {
    clearInterval(gameInterval);
    gameActive = false;
    const earnedTokens = Math.floor(gameScore / 10);
    tg.showPopup({
        title: "Game Over",
        message: `You scored ${gameScore} points and earned ${earnedTokens} MMX tokens!`,
        buttons: [{text: "Awesome!"}]
    });
    document.getElementById('gameContainer').style.display = 'none';
}

function updateGameUI() {
    document.getElementById('gameScore').textContent = `Score: ${gameScore}`;
    document.getElementById('gameTimer').textContent = `Time: ${gameTimer}s`;
}

function onGameObjectClick() {
    if (!gameActive) return;
    gameScore += 1;
    updateGameUI();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    stats.update();

    particles.rotation.y += 0.0001;

    collectibles.forEach(collectible => {
        collectible.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

// Ждем загрузки всех скриптов перед инициализацией приложения
window.addEventListener('load', initializeApp);