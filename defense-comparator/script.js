document.addEventListener('DOMContentLoaded', () => { 
    const form = document.getElementById('defense-form');
    const baseHpInput = document.getElementById('base-hp');
    const baseDefenseInput = document.getElementById('base-defense');
    const baseSpDefenseInput = document.getElementById('base-sp-defense');
    const resultsSection = document.getElementById('results-section');
    const comparisonResultsDiv = document.getElementById('comparison-results');
    const ingameStatsResultsDiv = document.getElementById('ingame-stats-results');
    const loadingMessage = document.getElementById('loading-message');
    const submitButton = form?.querySelector('button[type="submit"]');

    if (!form || !submitButton || !comparisonResultsDiv || !ingameStatsResultsDiv || !resultsSection || !loadingMessage) {
        console.error('Missing required DOM elements. Check your HTML IDs.');
        return;
    }

    let allPokemonList = [];
    const statsCache = {};
    let currentRunAbort = null; 

    
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function fetchWithRetry(url, { tries = 5, backoff = 600 } = {}) {
        for (let i = 0; i < tries; i++) {
            try {
                const res = await fetch(url);
                if (res.status === 429) {
                    
                    await sleep(backoff * (i + 1));
                    continue;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res;
            } catch (e) {
                if (i === tries - 1) throw e;
                await sleep(backoff * (i + 1));
            }
        }
        throw new Error('Unreachable');
    }

    function pLimit(concurrency) {
        let active = 0;
        const queue = [];
        const next = () => {
            if (active >= concurrency || queue.length === 0) return;
            active++;
            const { fn, resolve, reject } = queue.shift();
            fn().then(resolve, reject).finally(() => {
                active--;
                next();
            });
        };
        return (fn) => new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            next();
        });
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
    }

    
    async function fetchPokemonList() {
        submitButton.disabled = true;
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Loading Pokémon list... (only the first time)';

        const cached = localStorage.getItem('allPokemonList');
        if (cached) {
            allPokemonList = JSON.parse(cached);
            loadingMessage.style.display = 'none';
            submitButton.disabled = false;
            return;
        }

        try {
            const response = await fetchWithRetry('https://pokeapi.co/api/v2/pokemon?limit=1500');
            const data = await response.json();
            allPokemonList = data.results.map(p => ({ name: p.name, url: p.url }));
            localStorage.setItem('allPokemonList', JSON.stringify(allPokemonList));
        } catch (error) {
            console.error(error);
            loadingMessage.textContent = "Error loading list. Please reload the page.";
        } finally {
            loadingMessage.style.display = 'none';
            submitButton.disabled = false;
        }
    }

    async function fetchPokemonStats(pokemon) {
        if (statsCache[pokemon.name]) return statsCache[pokemon.name];

        const cachedStats = localStorage.getItem(`stats-${pokemon.name}`);
        if (cachedStats) {
            const obj = JSON.parse(cachedStats);
            statsCache[pokemon.name] = obj;
            return obj;
        }

        try {
            const res = await fetchWithRetry(pokemon.url, { tries: 6, backoff: 700 });
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

  
    async function ensureAllStatsLoaded(signal) {
        // si ya tenías stats en localStorage, statsCache se llenará on-demand al leerlas
        const toFetch = allPokemonList.filter(p => !localStorage.getItem(`stats-${p.name}`));

        if (toFetch.length === 0) return;

        submitButton.disabled = true;
        loadingMessage.style.display = 'block';

        const limit = pLimit(10); 
        let done = 0;
        const total = toFetch.length;

        await Promise.allSettled(
            toFetch.map(p => limit(async () => {
                if (signal?.aborted) return;
                const s = await fetchPokemonStats(p);
                done++;
                if (done % 10 === 0 || done === total) {
                    loadingMessage.textContent = `Downloading base stats... ${done}/${total}`;
                }
            }))
        );

        loadingMessage.style.display = 'none';
        submitButton.disabled = false;
    }

    async function findAndDisplay(event) {
        event.preventDefault();

        if (currentRunAbort) currentRunAbort.abort();
        currentRunAbort = new AbortController();
        const { signal } = currentRunAbort;

        submitButton.disabled = true;
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Preparing data...';

        const baseHp = parseInt(baseHpInput.value);
        const baseDef = parseInt(baseDefenseInput.value);
        const baseSpd = parseInt(baseSpDefenseInput.value);

        if (Number.isNaN(baseHp) || Number.isNaN(baseDef) || Number.isNaN(baseSpd)) {
            loadingMessage.textContent = 'Please enter valid base stats.';
            submitButton.disabled = false;
            return;
        }
  
        await ensureAllStatsLoaded(signal);
        if (signal.aborted) return;

        loadingMessage.textContent = 'Calculating...';

        const userPhysicalBulk = baseHp * baseDef;
        const userSpecialBulk = baseHp * baseSpd;

        let closestPhysical = { diff: Infinity };
        let closestSpecial = { diff: Infinity };

        for (const p of allPokemonList) {
            if (signal.aborted) return;

            let stats = statsCache[p.name];
            if (!stats) {
                const cached = localStorage.getItem(`stats-${p.name}`);
                if (!cached) continue; 
                stats = JSON.parse(cached);
                statsCache[p.name] = stats;
            }

            const physicalBulk = stats.hp * stats.defense;
            const specialBulk = stats.hp * stats.spDefense;

            const physicalDiff = Math.abs(userPhysicalBulk - physicalBulk);
            const specialDiff = Math.abs(userSpecialBulk - specialBulk);

            if (physicalDiff < closestPhysical.diff) closestPhysical = { ...stats, diff: physicalDiff };
            if (specialDiff < closestSpecial.diff) closestSpecial = { ...stats, diff: specialDiff };
        }

        comparisonResultsDiv.innerHTML = `
            <p>Your Physical Bulk is: <strong>${userPhysicalBulk}</strong>; the closest to that is: 
            <strong>${capitalize(closestPhysical.name)}</strong> [Bulk (HP: ${closestPhysical.hp}, DEF: ${closestPhysical.defense})]</p>

            <p>Your Special Bulk is: <strong>${userSpecialBulk}</strong>; the closest to that is: 
            <strong>${capitalize(closestSpecial.name)}</strong> [Bulk (HP: ${closestSpecial.hp}, Sp.DEF: ${closestSpecial.spDefense})]</p>
        `;

        displayInGameStats(baseHp, baseDef, baseSpd);

        resultsSection.style.display = 'block';
        loadingMessage.style.display = 'none';
        submitButton.disabled = false;
    }

    function calculateHP(base, ev = 0, iv = 31, level = 100) {
        
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    }

    function calculateStat(base, ev = 0, iv = 31, nature = 1.0, level = 100) {
        const baseValue = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
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


