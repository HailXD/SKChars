document.addEventListener('DOMContentLoaded', () => {
    const charactersContainer = document.getElementById('characters-container');
    const searchBar           = document.getElementById('search-bar');
    const hailContainer       = document.getElementById('hail-container');
    const xmlInput            = document.getElementById('xml-input');
    const processButton       = document.getElementById('process-button');
    const updateButton        = document.getElementById('update-button');
    const gemsInput           = document.getElementById('gems-input');
    const codeOutput          = document.getElementById('code-output');
    const copyButton          = document.getElementById('copy-button');

    /* ------- state ------- */
    let charactersData = {};
    let playerId       = '';
    let unlockedSkins  = {};          // all known skin / unlock values
    let changedSkins   = new Set();   // keys the user actually toggled this session

    /* ------- hail ui toggle ------- */
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('hail')) hailContainer.style.display = 'block';

    /* ------- load character atlas ------- */
    fetch('characters.json')
        .then(r => r.json())
        .then(data => { charactersData = data; renderCharacters(charactersData); })
        .catch(err => console.error('Error fetching character data:', err));

    /* ------- helpers ------- */
    function markKeyChanged(key) { changedSkins.add(key); }

    /* ------- render ------- */
    function renderCharacters(data) {
        charactersContainer.innerHTML = '';
        for (const characterName in data) {
            if (!data.hasOwnProperty(characterName)) continue;

            const character = data[characterName];
            const card      = document.createElement('div');
            card.classList.add('character-card');

            /* header */
            const header  = document.createElement('div');
            header.classList.add('character-header');

            const nameEl  = document.createElement('div');
            nameEl.classList.add('character-name');
            nameEl.textContent = characterName;

            const idEl    = document.createElement('div');
            idEl.classList.add('character-id');
            idEl.textContent = `ID: ${character.id}`;

            header.appendChild(nameEl);
            header.appendChild(idEl);

            /* skins */
            const skinsWrap = document.createElement('div');
            skinsWrap.classList.add('skins-container');

            character.skins.forEach(skin => {
                const skinEl   = document.createElement('div');
                skinEl.classList.add('skin');

                const unlockKey = `${playerId}_c${character.id}_unlock`;
                const skinKey   = `${playerId}_c${character.id}_skin${skin.index}`;

                if (unlockedSkins[unlockKey]?.toLowerCase() === 'true' &&
                    unlockedSkins[skinKey] === 1) {
                    skinEl.classList.add('unlocked');
                }

                /* click handler */
                skinEl.addEventListener('click', () => {
                    const wasUnlocked = skinEl.classList.toggle('unlocked');
                    if (wasUnlocked) {
                        unlockedSkins[unlockKey] = 'true';
                        unlockedSkins[skinKey]   = 1;
                    } else {
                        unlockedSkins[skinKey]   = 0;
                        /* If this was skin 0 or no skins remain, _unlock => false */
                        if (skin.index === 0) {
                            unlockedSkins[unlockKey] = 'false';
                        } else {
                            const otherSkinKeys = Object.keys(unlockedSkins)
                                .filter(k => k.startsWith(`${playerId}_c${character.id}_skin`) && k !== skinKey);
                            const anyStillUnlocked = otherSkinKeys.some(k => unlockedSkins[k] === 1);
                            if (!anyStillUnlocked) unlockedSkins[unlockKey] = 'false';
                        }
                    }

                    /* record changed keys */
                    markKeyChanged(skinKey);
                    markKeyChanged(unlockKey);
                });

                /* visuals */
                const img   = document.createElement('img');
                img.classList.add('skin-gif');
                img.src = skin.url;
                img.alt = skin.name;

                const idx   = document.createElement('div');
                idx.classList.add('skin-index');
                idx.textContent = `Index: ${skin.index}`;

                const label = document.createElement('div');
                label.classList.add('skin-name');
                label.textContent = skin.name;

                skinEl.appendChild(img);
                skinEl.appendChild(idx);
                skinEl.appendChild(label);
                skinsWrap.appendChild(skinEl);
            });

            card.appendChild(header);
            card.appendChild(skinsWrap);
            charactersContainer.appendChild(card);
        }
    }

    /* ------- search ------- */
    searchBar.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        const filtered = {};
        for (const name in charactersData) {
            const c = charactersData[name];
            if (
                name.toLowerCase().includes(term) ||
                c.skins.some(s => s.name.toLowerCase().includes(term))
            ) filtered[name] = c;
        }
        renderCharacters(filtered);
    });

    /* ------- parse existing XML ------- */
    processButton.addEventListener('click', () => {
        playerId      = '';
        unlockedSkins = {};
        changedSkins  = new Set(); // reset

        const xml   = xmlInput.value;
        const doc   = new DOMParser().parseFromString(xml, 'application/xml');
        const keys  = doc.getElementsByTagName('key');

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].textContent;
            if (!playerId && key.includes('_c0') && !key.toLowerCase().includes('local')) {
                playerId = key.split('_')[0];
            }
            if (playerId && key.startsWith(playerId)) {
                const valNode = keys[i].nextElementSibling;
                if (!valNode) continue;
                unlockedSkins[key] = valNode.tagName === 'integer'
                    ? parseInt(valNode.textContent, 10)
                    : valNode.textContent;
            }
        }
        renderCharacters(charactersData);
    });

    /* ------- update XML with changes ------- */
    updateButton.addEventListener('click', () => {
        let xmlData = xmlInput.value;

        /* ensure we have playerId and initial parse */
        if (!playerId) processButton.click();

        /* GEM patch (always) */
        const gemsKey      = `${playerId}_gems`;
        const lastGemsKey  = `${playerId}_last_gems`;
        const gemsValue    = gemsInput.value;
        if (gemsValue) {
            const gemsRe     = new RegExp(`<key>${gemsKey}<\\/key>\\s*<integer>\\d+<\\/integer>`);
            const lastGemsRe = new RegExp(`<key>${lastGemsKey}<\\/key>\\s*<integer>\\d+<\\/integer>`);
            if (gemsRe.test(xmlData)) {
                xmlData = xmlData.replace(gemsRe,     `<key>${gemsKey}</key><integer>${gemsValue}</integer>`);
                xmlData = xmlData.replace(lastGemsRe, `<key>${lastGemsKey}</key><integer>${gemsValue}</integer>`);
            } else {
                xmlData = xmlData.replace('</dict>', 
                    `<key>${gemsKey}</key><integer>${gemsValue}</integer></dict>`);
            }
        }

        /* Only loop over keys the user *touched* */
        for (const key of changedSkins) {
            if (key.endsWith('_gems')) continue;   // guard, though unlikely

            const value   = unlockedSkins[key];
            const keyRe   = new RegExp(`<key>${key}<\\/key>\\s*<(integer|string)>[^<]+<\\/\\1>`);
            let repl      = `<key>${key}</key>` +
                            (typeof value === 'number'
                                ? `<integer>${value}</integer>`
                                : `<string>${value}</string>`);

            if (keyRe.test(xmlData)) {
                xmlData = xmlData.replace(keyRe, repl);
            } else {
                xmlData = xmlData.replace('</dict>', `${repl}</dict>`);
            }
        }

        /* prettify */
        codeOutput.textContent = xmlData.replace(/>\s+</g, '><').trim();
    });

    /* ------- copy helper ------- */
    copyButton.addEventListener('click', () => {
        const sel = window.getSelection();
        const rng = document.createRange();
        rng.selectNodeContents(codeOutput);
        sel.removeAllRanges();
        sel.addRange(rng);

        copyButton.textContent = 'Copied!';
        setTimeout(() => copyButton.textContent = 'Copy', 1500);
    });
});
