document.addEventListener('DOMContentLoaded', () => {
    const charactersContainer = document.getElementById('characters-container');
    const searchBar = document.getElementById('search-bar');
    const hailContainer = document.getElementById('hail-container');
    const xmlInput = document.getElementById('xml-input');
    const processButton = document.getElementById('process-button');
    const codeOutput = document.getElementById('code-output');
    let charactersData = {};

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
        const xmlData = xmlInput.value;
        const keyRegex = /<key>([^<]+)<\/key>/g;
        let match;
        let output = '';
        while ((match = keyRegex.exec(xmlData)) !== null) {
            const key = match[1];
            if (key.includes('c0') && !key.toLowerCase().includes('local')) {
                const segments = key.split('_');
                output += segments[0] + '\n';
            }
        }
        codeOutput.textContent = output;
    });
});