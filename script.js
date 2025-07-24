document.addEventListener("DOMContentLoaded", () => {
    const charactersContainer = document.getElementById("characters-container");
    const searchBar = document.getElementById("search-bar");
    const hailContainer = document.getElementById("hail-container");
    const xmlInput = document.getElementById("xml-input");
    const processButton = document.getElementById("process-button");
    const updateButton = document.getElementById("update-button");
    const keySearchBar = document.getElementById("key-search-bar");
    const tableContainer = document.getElementById("table-container");
    const xmlOutput = document.getElementById("xml-output");

    let parsedData = {};
    let changedKeys = new Set();

    if (window.location.search.includes("hail")) {
        hailContainer.style.display = "block";
    }

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
                const skinId = `_c${character.id}_skin${skin.index}`;
                idx.innerText = `Index: ${skin.index}\n${skinId}`;

                skinEl.addEventListener("click", () => {
                    keySearchBar.value = skinId;
                    keySearchBar.dispatchEvent(new Event("input"));
                });

                const priceEl = document.createElement("div");
                priceEl.classList.add("skin-price");
                priceEl.textContent = skin.price;

                const skinInfo = document.createElement("div");
                skinInfo.classList.add("skin-info");

                const label = document.createElement("div");
                label.classList.add("skin-name");
                label.textContent = skin.name;

                skinInfo.appendChild(label);
                skinInfo.appendChild(priceEl);

                skinEl.appendChild(img);
                skinEl.appendChild(idx);
                skinEl.appendChild(skinInfo);
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
        const xmlText = xmlInput.value;
        if (!xmlText) return;

        changedKeys.clear();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        const dict = xmlDoc.querySelector("dict");
        if (!dict) return;

        const children = Array.from(dict.children);
        parsedData = {};

        for (let i = 0; i < children.length; i += 2) {
            if (children[i].tagName === 'key') {
                const key = children[i].textContent;
                const valueElement = children[i + 1];
                const type = valueElement.tagName;
                const value = valueElement.textContent;
                parsedData[key] = { type, value };
            }
        }
        renderTable(parsedData);
    });

    function renderTable(data) {
        tableContainer.innerHTML = "";
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        const headerRow = document.createElement("tr");
        const keyHeader = document.createElement("th");
        keyHeader.textContent = "Key";
        const valueHeader = document.createElement("th");
        valueHeader.textContent = "Value";
        const typeHeader = document.createElement("th");
        typeHeader.textContent = "Type";
        headerRow.appendChild(keyHeader);
        headerRow.appendChild(valueHeader);
        headerRow.appendChild(typeHeader);
        thead.appendChild(headerRow);

        for (const key in data) {
            const row = document.createElement("tr");
            const keyCell = document.createElement("td");
            keyCell.textContent = key;
            const valueCell = document.createElement("td");
            valueCell.textContent = data[key].value;
            valueCell.contentEditable = "true";
            valueCell.addEventListener("input", (e) => {
                parsedData[key].value = e.target.textContent;
                changedKeys.add(key);
            });
            const typeCell = document.createElement("td");
            typeCell.textContent = data[key].type;
            row.appendChild(keyCell);
            row.appendChild(valueCell);
            row.appendChild(typeCell);
            tbody.appendChild(row);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    }

    updateButton.addEventListener("click", () => {
        let updatedXml = xmlInput.value;

        for (const key of changedKeys) {
            if (parsedData[key]) {
                const { type, value } = parsedData[key];

                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                const searchRegex = new RegExp(
                    `(<key>${escapedKey}<\\/key>\\s*<${type}>)(.*?)(<\\/${type}>)`,
                    "s"
                );

                const escapedValue = String(value)
                    .replace(/&/g, "&")
                    .replace(/</g, "<")
                    .replace(/>/g, ">")
                    .replace(/"/g, '"')
                    .replace(/'/g, "'");

                updatedXml = updatedXml.replace(searchRegex, `$1${escapedValue}$3`);
            }
        }
        xmlOutput.value = updatedXml;
        changedKeys.clear();
    });

    keySearchBar.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = {};
        for (const key in parsedData) {
            if (key.toLowerCase().includes(searchTerm)) {
                filteredData[key] = parsedData[key];
            }
        }
        renderTable(filteredData);
    });
});
