document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('defense-form');
    const baseHpInput = document.getElementById('base-hp');
    const baseDefenseInput = document.getElementById('base-defense');
    const baseSpDefenseInput = document.getElementById('base-sp-defense');
    const resultsSection = document.getElementById('results-section');
    const comparisonResultsDiv = document.getElementById('comparison-results');
    const ingameStatsResultsDiv = document.getElementById('ingame-stats-results');
    const loadingMessage = document.getElementById('loading-message');
    const submitButton = form.querySelector('button[type="submit"]');

    let allPokemonList = [];
    const statsCache = {}; // cache local para stats

    // Fetch lista de Pokémon
    async function fetchPokemonList() {
        submitButton.disabled = true;
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Loading Pokémon list...';

        const cached = localStorage.getItem('allPokemonList');
        if (cached) {
            allPokemonList = JSON.parse(cached);
            submitButton.disabled = false;
            loadingMessage.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1500');
            const data = await response.json();
            allPokemonList = data.results.map(p => ({ name: p.name, url: p.url }));
            localStorage.setItem('allPokemonList', JSON.stringify(allPokemonList));
        } catch (error) {
            console.error(error);
            loadingMessage.textContent = "Error loading Pokémon list. Please reload the page.";
        } finally {
            loadingMessage.style.display = 'none';
            submitButton.disabled = false;
        }
    }

    // Fetch stats de un Pokémon (usa cache si ya existe)
    async function fetchPokemonStats(pokemon) {
        if (statsCache[pokemon.name]) return statsCache[pokemon.name];

        const cachedStats = localStorage.getItem(`stats-${pokemon.name}`);
        if (cachedStats) {
            statsCache[pokemon.name] = JSON.parse(cachedStats);
            return statsCache[pokemon.name];
        }

        try {
            const res = await fetch(pokemon.url);
            const data = await res.json();
            const stats = {
                name: pokemon.name,
                hp: data.stats[0].base_stat,
                defense: data.stats[2].base_stat,
                spDefense: data.stats[4].base_stat
            };
            statsCache[pokemon.name] = stats;
            localStorage.setItem(`stats-${pokemon.name}`, JSON.stringify(stats));
            return stats;
        } catch (error) {
            console.error(`Error fetching stats for ${pokemon.name}`, error);
            return null;
        }
    }

    async function findAndDisplay(event) {
        event.preventDefault();
        submitButton.disabled = true;
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Calculating... (it may take a while the first time)';

        const baseHp = parseInt(baseHpInput.value);
        const baseDef = parseInt(baseDefenseInput.value);
        const baseSpd = parseInt(baseSpDefenseInput.value);

        const userPhysicalBulk = baseHp * baseDef;
        const userSpecialBulk = baseHp * baseSpd;

        let closestPhysical = { diff: Infinity };
        let closestSpecial = { diff: Infinity };

        for (const p of allPokemonList) {
            const stats = await fetchPokemonStats(p);
            if (!stats) continue;

            const physicalBulk = stats.hp * stats.defense;
            const specialBulk = stats.hp * stats.spDefense;

            const physicalDiff = Math.abs(userPhysicalBulk - physicalBulk);
            const specialDiff = Math.abs(userSpecialBulk - specialBulk);

            if (physicalDiff < closestPhysical.diff) closestPhysical = { ...stats, diff: physicalDiff };
            if (specialDiff < closestSpecial.diff) closestSpecial = { ...stats, diff: specialDiff };
        }

        // Mostrar resultados en inglés
        comparisonResultsDiv.innerHTML = `
            <p>Your most similar physical defender: <strong>${capitalize(closestPhysical.name)}</strong> (HP: ${closestPhysical.hp}, DEF: ${closestPhysical.defense})</p>
            <p>Your most similar special defender: <strong>${capitalize(closestSpecial.name)}</strong> (HP: ${closestSpecial.hp}, Sp.DEF: ${closestSpecial.spDefense})</p>
        `;

        displayInGameStats(baseHp, baseDef, baseSpd);

        resultsSection.style.display = 'block';
        loadingMessage.style.display = 'none';
        submitButton.disabled = false;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
    }

    function calculateHP(base, ev = 0, iv = 31) {
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 100) / 100) + 100 + 10;
    }

    function calculateStat(base, ev = 0, iv = 31, nature = 1.0) {
        const baseValue = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * 100) / 100) + 5;
        return Math.floor(baseValue * nature);
    }

    function displayInGameStats(hp, def, spd) {
        ingameStatsResultsDiv.innerHTML = '';

        const builds = [
            { name: "Physical Wall", stats: { "HP": calculateHP(hp, 252), "Defense": calculateStat(def, 252, 31, 1.1), "Sp. Defense": calculateStat(spd, 4) } },
            { name: "Special Wall", stats: { "HP": calculateHP(hp, 252), "Defense": calculateStat(def, 4), "Sp. Defense": calculateStat(spd, 252, 31, 1.1) } },
            { name: "Max HP (Neutral)", stats: { "HP": calculateHP(hp, 252), "Defense": calculateStat(def, 0), "Sp. Defense": calculateStat(spd, 0) } }
        ];

        builds.forEach(build => {
            const buildDiv = document.createElement('div');
            buildDiv.className = 'build-container';
            const title = document.createElement('h3');
            title.textContent = build.name;
            buildDiv.appendChild(title);

            for (const [statName, statValue] of Object.entries(build.stats)) {
                const statBar = createStatBar(statName, statValue);
                buildDiv.appendChild(statBar);
            }

            ingameStatsResultsDiv.appendChild(buildDiv);
        });
    }

    function getColor(stat) {
        const ratio = Math.max(0, Math.min(1, stat / 714));
        const hue = 0 + ratio * (280 - 0); // rojo → violeta
        return `hsl(${hue}, 80%, 50%)`;
    }

    function createStatBar(name, value) {
        const MAX_STAT = 714;
        const percentage = Math.min(100, (value / MAX_STAT) * 100);

        const container = document.createElement('div');
        container.className = 'stat-bar-container';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'stat-name';
        nameDiv.textContent = name;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'stat-value';
        valueDiv.textContent = value;

        const barDiv = document.createElement('div');
        barDiv.className = 'stat-bar';

        const fillDiv = document.createElement('div');
        fillDiv.className = 'stat-bar-fill';
        fillDiv.style.width = `${percentage}%`;
        fillDiv.style.backgroundColor = getColor(value);

        barDiv.appendChild(fillDiv);
        container.appendChild(nameDiv);
        container.appendChild(valueDiv);
        container.appendChild(barDiv);

        return container;
    }

    form.addEventListener('submit', findAndDisplay);
    fetchPokemonList();
});
