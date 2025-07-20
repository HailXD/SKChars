document.addEventListener("DOMContentLoaded", () => {
    const charactersContainer = document.getElementById("characters-container");
    const searchBar = document.getElementById("search-bar");

    let charactersData = {};
    let playerId = "";
    let unlockedSkins = {};
    let changedSkins = new Set();

    fetch("characters.json")
        .then((r) => r.json())
        .then((data) => {
            charactersData = data;
            renderCharacters(charactersData);
        })
        .catch((err) => console.error("Error fetching character data:", err));

    function markKeyChanged(key) {
        changedSkins.add(key);
    }

    function renderCharacters(data) {
        charactersContainer.innerHTML = "";
        for (const characterName in data) {
            if (!data.hasOwnProperty(characterName)) continue;

            const character = data[characterName];
            const card = document.createElement("div");
            card.classList.add("character-card");

            const header = document.createElement("div");
            header.classList.add("character-header");

            const nameEl = document.createElement("div");
            nameEl.classList.add("character-name");
            nameEl.textContent = characterName;

            const idEl = document.createElement("div");
            idEl.classList.add("character-id");
            idEl.textContent = `ID: ${character.id}`;

            header.appendChild(nameEl);
            header.appendChild(idEl);

            const skinsWrap = document.createElement("div");
            skinsWrap.classList.add("skins-container");

            character.skins.forEach((skin) => {
                const skinEl = document.createElement("div");
                skinEl.classList.add("skin");

                const img = document.createElement("img");
                img.classList.add("skin-gif");
                img.src = skin.url;
                img.alt = skin.name;

                const idx = document.createElement("div");
                idx.classList.add("skin-index");
                idx.textContent = `Index: ${skin.index}`;

                const label = document.createElement("div");
                label.classList.add("skin-name");
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

    searchBar.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = {};
        for (const name in charactersData) {
            const c = charactersData[name];
            if (
                name.toLowerCase().includes(term) ||
                c.skins.some((s) => s.name.toLowerCase().includes(term))
            )
                filtered[name] = c;
        }
        renderCharacters(filtered);
    });

    processButton.addEventListener("click", () => {
        playerId = "";
        unlockedSkins = {};
        changedSkins = new Set();

        const xml = xmlInput.value;
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        const keys = doc.getElementsByTagName("key");

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i].textContent;
            if (
                !playerId &&
                key.includes("_c0") &&
                !key.toLowerCase().includes("local")
            ) {
                playerId = key.split("_")[0];
            }
            if (playerId && key.startsWith(playerId)) {
                const valNode = keys[i].nextElementSibling;
                if (!valNode) continue;
                unlockedSkins[key] =
                    valNode.tagName === "integer"
                        ? parseInt(valNode.textContent, 10)
                        : valNode.textContent;
            }
        }
        renderCharacters(charactersData);
    });

    updateButton.addEventListener("click", () => {
        let xmlData = xmlInput.value;

        if (!playerId) processButton.click();

        const gemsKey = `${playerId}_gems`;
        const lastGemsKey = `${playerId}_last_gems`;
        const gemsValue = gemsInput.value;
        if (gemsValue) {
            const gemsRe = new RegExp(
                `<key>${gemsKey}<\\/key>\\s*<integer>\\d+<\\/integer>`
            );
            const lastGemsRe = new RegExp(
                `<key>${lastGemsKey}<\\/key>\\s*<integer>\\d+<\\/integer>`
            );
            if (gemsRe.test(xmlData)) {
                xmlData = xmlData.replace(
                    gemsRe,
                    `<key>${gemsKey}</key><integer>${gemsValue}</integer>`
                );
                xmlData = xmlData.replace(
                    lastGemsRe,
                    `<key>${lastGemsKey}</key><integer>${gemsValue}</integer>`
                );
            } else {
                xmlData = xmlData.replace(
                    "</dict>",
                    `<key>${gemsKey}</key><integer>${gemsValue}</integer></dict>`
                );
            }
        }

        for (const key of changedSkins) {
            if (key.endsWith("_gems")) continue;

            const value = unlockedSkins[key];
            const keyRe = new RegExp(
                `<key>${key}<\\/key>\\s*<(integer|string)>[^<]+<\\/\\1>`
            );
            let repl =
                `<key>${key}</key>` +
                (typeof value === "number"
                    ? `<integer>${value}</integer>`
                    : `<string>${value}</string>`);

            if (keyRe.test(xmlData)) {
                xmlData = xmlData.replace(keyRe, repl);
            } else {
                xmlData = xmlData.replace("</dict>", `${repl}</dict>`);
            }
        }

        codeOutput.textContent = xmlData.replace(/>\s+</g, "><").trim();
    });

    copyButton.addEventListener("click", () => {
        const sel = window.getSelection();
        const rng = document.createRange();
        rng.selectNodeContents(codeOutput);
        sel.removeAllRanges();
        sel.addRange(rng);

        copyButton.textContent = "Copied!";
        setTimeout(() => (copyButton.textContent = "Copy"), 1500);
    });
});
