document.addEventListener('DOMContentLoaded', () => {
    const selectP1 = document.getElementById('p1-pokemon-select');
    const selectP2 = document.getElementById('p2-pokemon-select');
    const modeButton = document.getElementById('mode-button');
    const showStatsButton = document.getElementById('show-stats-button');
    const form2 = document.getElementById('poke2-form');
    const resultsSection = document.getElementById('results-section');
    const singleResultContainer = document.getElementById('single-result');
    const comparisonResultContainer = document.getElementById('comparison-result');

    const statNames = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
    let isComparisonMode = false;

    async function fetchPokemonList() {
        const cachedList = localStorage.getItem('pokemonList');
        if (cachedList) {
            populateSelects(JSON.parse(cachedList));
            return;
        }

        try {
            const [speciesResponse, formsResponse] = await Promise.all([
                fetch('https://pokeapi.co/api/v2/pokemon-species?limit=10000'),
                fetch('https://pokeapi.co/api/v2/pokemon?limit=10000')
            ]);
            const speciesData = await speciesResponse.json();
            const formsData = await formsResponse.json();

            const allPokemonMap = new Map();
            speciesData.results.forEach(p => allPokemonMap.set(p.name, p));

            formsData.results.forEach(p => {
                const name = p.name;
                if (!name.includes('-gmax') && (name.includes('-mega') || name.includes('-alola') || name.includes('-galar') || name.includes('-hisui') || name.includes('-paldea'))) {
                    allPokemonMap.set(name, p);
                }
            });

            const allPokemon = Array.from(allPokemonMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            
            localStorage.setItem('pokemonList', JSON.stringify(allPokemon));
            populateSelects(allPokemon);

        } catch (error) {
            console.error('Error fetching Pokémon list:', error);
        }
    }

    function populateSelects(pokemonList) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a Pokemon...';
        
        selectP1.appendChild(defaultOption.cloneNode(true));
        selectP2.appendChild(defaultOption.cloneNode(true));

        pokemonList.forEach(pokemon => {
            const option = document.createElement('option');
            option.value = pokemon.name;
            option.textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1).replace(/-/g, ' ');
            selectP1.appendChild(option.cloneNode(true));
            selectP2.appendChild(option);
        });
    }

    async function loadPokemonStats(pokemonName, prefix) {
        if (!pokemonName) return;
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            const data = await response.json();
            
            document.getElementById(`${prefix}-hp`).value = data.stats[0].base_stat;
            document.getElementById(`${prefix}-attack`).value = data.stats[1].base_stat;
            document.getElementById(`${prefix}-defense`).value = data.stats[2].base_stat;
            document.getElementById(`${prefix}-sp-attack`).value = data.stats[3].base_stat;
            document.getElementById(`${prefix}-sp-defense`).value = data.stats[4].base_stat;
            document.getElementById(`${prefix}-speed`).value = data.stats[5].base_stat;

            calculateAndDisplayStats();
        } catch (error) {
            console.error(`Error fetching stats for ${pokemonName}:`, error);
        }
    }
    
    function calculateAndDisplayStats() {
        const stats1 = getStats('p1');
        const stats2 = getStats('p2');

        if (stats1.some(s => s === null)) {
            resultsSection.style.display = 'none';
            return;
        }
        
        resultsSection.style.display = 'block';
        singleResultContainer.innerHTML = '';
        comparisonResultContainer.innerHTML = '';

        if (!isComparisonMode || stats2.some(s => s === null)) {
            comparisonResultContainer.style.display = 'none';
            singleResultContainer.style.display = 'block';
            
            const bst1 = stats1.reduce((a, b) => a + b, 0);
            statNames.forEach((name, i) => {
                const statBar = createStatBar(name, stats1[i]);
                singleResultContainer.appendChild(statBar);
            });
            singleResultContainer.innerHTML += `<div class="total-stats">Base Stat Total: ${bst1}</div>`;
        } else {
            singleResultContainer.style.display = 'none';
            comparisonResultContainer.style.display = 'block';
            
            const bst1 = stats1.reduce((a, b) => a + b, 0);
            const bst2 = stats2.reduce((a, b) => a + b, 0);
            
            statNames.forEach((name, i) => {
                const comparisonRow = createComparisonRow(name, stats1[i], stats2[i]);
                comparisonResultContainer.appendChild(comparisonRow);
            });

            const bstComparison = document.createElement('div');
            bstComparison.className = 'comparison-section total-stats-comparison';
            const bstDiff = bst1 - bst2;
            const bstWinner = bst1 > bst2 ? '➡️' : (bst2 > bst1 ? '⬅️' : '🤝');
            bstComparison.innerHTML = `
                <div class="bst-p1"><strong>BST:</strong> ${bst1}</div>
                <div class="middle-comparison">(${bstDiff > 0 ? '+' : ''}${bstDiff})<br>${bstWinner}</div>
                <div class="bst-p2"><strong>BST:</strong> ${bst2}</div>
            `;
            comparisonResultContainer.appendChild(bstComparison);
        }
    }

    function getStats(prefix) {
        const statsIds = ['hp', 'attack', 'defense', 'sp-attack', 'sp-defense', 'speed'];
        return statsIds.map(id => {
            const input = document.getElementById(`${prefix}-${id}`);
            return input && input.value ? parseInt(input.value, 10) : null;
        });
    }

    function toggleComparisonMode() {
        isComparisonMode = !isComparisonMode;
        form2.style.display = isComparisonMode ? 'block' : 'none';
        modeButton.textContent = isComparisonMode ? '1 Pokemon' : '2 Pokémon';
        calculateAndDisplayStats();
    }
    
    function getColor(stat) {
        const ratio = Math.max(0, Math.min(1, stat / 257));
        const hue = 0 + ratio * (280 - 0);
        return `hsl(${hue}, 80%, 50%)`;
    }

    function createStatBar(name, value) {
        const barContainer = document.createElement('div');
        barContainer.className = 'stat-bar-container';
        const percentage = Math.min(100, (value / 255) * 100);
        barContainer.innerHTML = `
            <div class="stat-name">${name}</div>
            <div class="stat-value">${value}</div>
            <div class="stat-bar">
                <div class="stat-bar-fill" style="width: ${percentage}%; background-color: ${getColor(value)};"></div>
            </div>`;
        return barContainer;
    }

    function createComparisonRow(name, stat1, stat2) {
        const row = document.createElement('div');
        row.className = 'comparison-section';
        const p1Percentage = Math.min(100, (stat1 / 255) * 100);
        const p2Percentage = Math.min(100, (stat2 / 255) * 100);
        const diff = stat1 - stat2;
        const winner = stat1 > stat2 ? '➡️' : (stat2 > stat1 ? '⬅️' : '🤝');
        row.innerHTML = `
            <div class="comparison-bar-container p1">
                <div class="stat-name">${name}</div>
                <div class="stat-value">${stat1}</div>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${p1Percentage}%; background-color: ${getColor(stat1)};"></div>
                </div>
            </div>
            <div class="middle-comparison">(${diff > 0 ? '+' : ''}${diff})<br>${winner}</div>
            <div class="comparison-bar-container p2">
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${p2Percentage}%; background-color: ${getColor(stat2)};"></div>
                </div>
                <div class="stat-value">${stat2}</div>
                <div class="stat-name">${name}</div>
            </div>`;
        return row;
    }
    
    selectP1.addEventListener('change', () => loadPokemonStats(selectP1.value, 'p1'));
    selectP2.addEventListener('change', () => loadPokemonStats(selectP2.value, 'p2'));
    modeButton.addEventListener('click', toggleComparisonMode);
    showStatsButton.addEventListener('click', calculateAndDisplayStats);
    
    fetchPokemonList();
});
