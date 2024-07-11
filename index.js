let camera, scene, renderer, controls, particles;
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

function init() {
    const tg = window.Telegram.WebApp;
    tg.expand();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 5;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    createStarfield();
    loadCollectibles();

    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCollectibleClick);

    document.getElementById('startGameBtn').addEventListener('click', startMiniGame);

    animate();
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
    loader = new THREE.GLTFLoader();
    const collectiblesData = [
        { name: 'Bitcoin', url: 'assets/models/bitcoin.glb', position: new THREE.Vector3(-2, 0, 0) },
        { name: 'Ethereum', url: 'assets/models/ethereum.glb', position: new THREE.Vector3(0, 0, 0) },
        { name: 'Dogecoin', url: 'assets/models/dogecoin.glb', position: new THREE.Vector3(2, 0, 0) },
    ];

    collectiblesData.forEach(data => {
        loader.load(data.url, (gltf) => {
            const model = gltf.scene;
            model.position.copy(data.position);
            model.scale.set(0.5, 0.5, 0.5);
            model.userData.name = data.name;
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

        window.Telegram.WebApp.showPopup({
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
    userExperience += 10;
    if (userExperience >= userLevel * 100) {
        userLevel++;
        window.Telegram.WebApp.showPopup({
            title: "Level Up!",
            message: `Congratulations! You've reached level ${userLevel}!`,
            buttons: [{text: "Great!"}]
        });
    }
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
    window.Telegram.WebApp.showPopup({
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

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();

    particles.rotation.y += 0.0001;

    collectibles.forEach(collectible => {
        collectible.rotation.y += 0.01;
    });

    renderer.render(scene, camera);
}

window.addEventListener('load', init);