document.addEventListener('DOMContentLoaded', () => {
    const charactersContainer = document.getElementById('characters-container');
    const searchBar = document.getElementById('search-bar');
    const hailContainer = document.getElementById('hail-container');
    const xmlInput = document.getElementById('xml-input');
    const processButton = document.getElementById('process-button');
    const updateButton = document.getElementById('update-button');
    const gemsInput = document.getElementById('gems-input');
    const codeOutput = document.getElementById('code-output');
    const copyButton = document.getElementById('copy-button');
    let charactersData = {};
    let playerId = '';
    let unlockedSkins = {};

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('hail')) {
        hailContainer.style.display = 'block';
    }

    fetch('characters.json')
        .then(response => response.json())
        .then(data => {
            charactersData = data;
            renderCharacters(charactersData);
        })
        .catch(error => console.error('Error fetching character data:', error));

    function renderCharacters(data) {
        charactersContainer.innerHTML = '';
        for (const characterName in data) {
            if (data.hasOwnProperty(characterName)) {
                const character = data[characterName];
                const characterCard = document.createElement('div');
                characterCard.classList.add('character-card');

                const characterHeader = document.createElement('div');
                characterHeader.classList.add('character-header');

                const nameElement = document.createElement('div');
                nameElement.classList.add('character-name');
                nameElement.textContent = characterName;

                const idElement = document.createElement('div');
                idElement.classList.add('character-id');
                idElement.textContent = `ID: ${character.id}`;

                characterHeader.appendChild(nameElement);
                characterHeader.appendChild(idElement);

                const skinsContainer = document.createElement('div');
                skinsContainer.classList.add('skins-container');

                character.skins.forEach(skin => {
                    const skinElement = document.createElement('div');
                    skinElement.classList.add('skin');
                    const unlockKey = `${playerId}_c${character.id}_unlock`;
                    const skinKey = `${playerId}_c${character.id}_skin${skin.index}`;

                    if (unlockedSkins[unlockKey] && unlockedSkins[unlockKey].toLowerCase() === 'true' && unlockedSkins[skinKey] === 1) {
                        skinElement.classList.add('unlocked');
                    }

                    skinElement.addEventListener('click', () => {
                        skinElement.classList.toggle('unlocked');
                        if (skinElement.classList.contains('unlocked')) {
                            unlockedSkins[unlockKey] = 'true';
                            unlockedSkins[skinKey] = 1;
                        } else {
                            unlockedSkins[skinKey] = 0;
                            const characterSkins = Object.keys(unlockedSkins).filter(k => k.startsWith(`${playerId}_c${character.id}_skin`));
                            const isAnySkinUnlocked = characterSkins.some(k => unlockedSkins[k] === 1);
                            if (!isAnySkinUnlocked) {
                                unlockedSkins[unlockKey] = 'false';
                            }
                        }
                    });

                    const skinGif = document.createElement('img');
                    skinGif.classList.add('skin-gif');
                    skinGif.src = skin.url;
                    skinGif.alt = skin.name;

                    const skinName = document.createElement('div');
                    skinName.classList.add('skin-name');
                    skinName.textContent = skin.name;

                    const skinIndex = document.createElement('div');
                    skinIndex.classList.add('skin-index');
                    skinIndex.textContent = `Index: ${skin.index}`;

                    skinElement.appendChild(skinGif);
                    skinElement.appendChild(skinIndex);
                    skinElement.appendChild(skinName);
                    skinsContainer.appendChild(skinElement);
                });

                characterCard.appendChild(characterHeader);
                characterCard.appendChild(skinsContainer);
                charactersContainer.appendChild(characterCard);
            }
        }
    }

    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = {};

        for (const characterName in charactersData) {
            if (charactersData.hasOwnProperty(characterName)) {
                const character = charactersData[characterName];
                const characterNameLower = characterName.toLowerCase();
                
                const hasMatchingSkin = character.skins.some(skin => skin.name.toLowerCase().includes(searchTerm));

                if (characterNameLower.includes(searchTerm) || hasMatchingSkin) {
                    filteredData[characterName] = character;
                }
            }
        }
        renderCharacters(filteredData);
    });

    processButton.addEventListener('click', () => {
        playerId = '';
        const xmlData = xmlInput.value;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlData, "application/xml");
        const keys = xmlDoc.getElementsByTagName('key');
        unlockedSkins = {};

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].textContent;
            if (!playerId && key.includes('_c0') && !key.toLowerCase().includes('local')) {
                playerId = key.split('_')[0];
            }
            if (key.startsWith(playerId)) {
                const valueNode = keys[i].nextElementSibling;
                if (valueNode && valueNode.tagName === 'integer') {
                    unlockedSkins[key] = parseInt(valueNode.textContent, 10);
                }
                 else if (valueNode && valueNode.tagName === 'string') {
                    unlockedSkins[key] = valueNode.textContent;
                }
            }
        }
        renderCharacters(charactersData);
    });

    updateButton.addEventListener('click', () => {
        let xmlData = xmlInput.value;
        if (!playerId) {
            processButton.click();
        }
        console.log(`${playerId}_gems`);
        const gemsKey = `${playerId}_gems`;
        const lastGemsKey = `${playerId}_last_gems`
        const gemsValue = gemsInput.value;
        if (gemsValue) {
            const gemsRegex = new RegExp(`<key>${gemsKey}<\\/key>\\s*<integer>\\d+<\\/integer>`);
            if (xmlData.match(gemsRegex)) {
                xmlData = xmlData.replace(gemsRegex, `<key>${gemsKey}</key><integer>${gemsValue}</integer>`);
                xmlData = xmlData.replace(lastGemsKey, `<key>${lastGemsKey}</key><integer>${gemsValue}</integer>`);
            } else {
                xmlData = xmlData.replace('</dict>', `<key>${gemsKey}</key><integer>${gemsValue}</integer></dict>`);
            }
        }

        for (const key in unlockedSkins) {
            if (unlockedSkins.hasOwnProperty(key) && !key.endsWith('_gems')) {
                const value = unlockedSkins[key];
                const keyRegex = new RegExp(`<key>${key}<\\/key>\\s*<(integer|string)>[^<]+<\\/\\1>`);
                let replacement = `<key>${key}</key>`;
                if (typeof value === 'number') {
                    replacement += `<integer>${value}</integer>`;
                } else {
                    replacement += `<string>${value}</string>`;
                }

                if (xmlData.match(keyRegex)) {
                    xmlData = xmlData.replace(keyRegex, replacement);
                } else {
                     xmlData = xmlData.replace('</dict>', `${replacement}</dict>`);
                }
            }
        }

        codeOutput.textContent = xmlData.replace(/>\s+</g, '><').trim();
    });

    copyButton.addEventListener('click', () => {
       const selection = window.getSelection();
       const range = document.createRange();
       range.selectNodeContents(codeOutput);
       selection.removeAllRanges();
       selection.addRange(range);
       
       copyButton.textContent = 'Copied!';
       setTimeout(() => {
           copyButton.textContent = 'Copy';
       }, 1500);
   });
});
