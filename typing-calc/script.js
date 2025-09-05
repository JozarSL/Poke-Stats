document.addEventListener('DOMContentLoaded', () => { 
    const types = ["Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying", "Ghost", "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Steel", "Water"];
    
    const typeChart = {
        Normal: { Fighting: 2, Ghost: 0 }, Fire: { Water: 2, Grass: 0.5, Ice: 0.5, Ground: 2, Bug: 0.5, Rock: 2, Steel: 0.5, Fairy: 0.5 },
        Water: { Fire: 0.5, Water: 0.5, Grass: 2, Electric: 2, Ice: 0.5, Steel: 0.5 }, Grass: { Fire: 2, Water: 0.5, Grass: 0.5, Electric: 0.5, Ice: 2, Poison: 2, Ground: 0.5, Flying: 2, Bug: 2 },
        Electric: { Electric: 0.5, Ground: 2, Flying: 0.5, Steel: 0.5 }, Ice: { Fire: 2, Ice: 0.5, Fighting: 2, Rock: 2, Steel: 2 },
        Fighting: { Flying: 2, Psychic: 2, Fairy: 2, Rock: 0.5, Bug: 0.5, Dark: 0.5 }, Poison: { Grass: 0.5, Fighting: 0.5, Poison: 0.5, Ground: 2, Psychic: 2, Bug: 0.5, Fairy: 0.5 },
        Ground: { Water: 2, Grass: 2, Electric: 0, Ice: 2, Poison: 0.5, Rock: 0.5 }, Flying: { Grass: 0.5, Electric: 2, Ice: 2, Fighting: 0.5, Ground: 0, Bug: 0.5, Rock: 2 },
        Psychic: { Fighting: 0.5, Psychic: 0.5, Bug: 2, Ghost: 2, Dark: 2 }, Bug: { Fire: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5, Flying: 2, Rock: 2 },
        Rock: { Normal: 0.5, Fire: 0.5, Water: 2, Grass: 2, Fighting: 2, Poison: 0.5, Ground: 2, Flying: 0.5, Steel: 2 },
        Ghost: { Normal: 0, Fighting: 0, Poison: 0.5, Bug: 0.5, Ghost: 2, Dark: 2 }, Dragon: { Fire: 0.5, Water: 0.5, Grass: 0.5, Electric: 0.5, Ice: 2, Dragon: 2, Fairy: 2 },
        Dark: { Psychic: 0, Dark: 0.5, Ghost: 0.5, Bug: 2, Fairy: 2, Fighting: 2 }, Steel: { Normal: 0.5, Fire: 2, Grass: 0.5, Ice: 0.5, Fighting: 2, Poison: 0, Ground: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5 },
        Fairy: { Fighting: 0.5, Poison: 2, Bug: 0.5, Dragon: 0, Dark: 0.5, Steel: 2 }
    };

    const typeColors = { Normal: "#A8A878", Fire: "#F08030", Water: "#6890F0", Grass: "#78C850", Electric: "#F8D030", Ice: "#98D8D8", Fighting: "#C03028", Poison: "#A040A0", Ground: "#E0C068", Flying: "#A890F0", Psychic: "#F85888", Bug: "#A8B820", Rock: "#B8A038", Ghost: "#705898", Dragon: "#7038F8", Dark: "#705848", Steel: "#B8B8D0", Fairy: "#EE99AC" };

    const titleColors = {
        'x4': '#FF0000',
        'x2': '#FF4500',
        'x0-5': '#1E90FF',
        'x0-25': '#4169E1',
        'x0': '#4B0082',
        '': '#000'
    };

    const type1Select = document.getElementById('type1');
    const type2Select = document.getElementById('type2');
    const type3Select = document.getElementById('type3');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results-section');

    function populateSelectors() {
        [type1Select, type2Select, type3Select].forEach((select, index) => {
            if (index > 0) select.add(new Option("None", "None"));
            types.forEach(type => select.add(new Option(type, type)));
        });
    }

    calculateBtn.addEventListener('click', () => {
        const type1 = type1Select.value;
        const type2 = type2Select.value;
        const type3 = type3Select.value;

        if (!type1) return;

        const defensiveTypes = [type1];
        if (type2 !== 'None' && type2 !== type1) defensiveTypes.push(type2);

        const offensiveTypes = [{type: type1, tag: '(STAB)'}];
        if (type2 !== 'None' && type2 !== type1) offensiveTypes.push({ type: type2, tag: '(STAB)'}); 
        if (type3 !== 'None') offensiveTypes.push({type: type3, tag: '(NS)'});
        
        displayResults(defensiveTypes, offensiveTypes);
    });

    function displayResults(defensiveTypes, offensiveTypes) {
        resultsSection.innerHTML = `
            <div class="analysis-grid">
                <div id="defensive-analysis" class="analysis-section">
                    <h3>Defensive Analysis (${defensiveTypes.join('/')})</h3>
                    ${getDefensiveAnalysisHTML(defensiveTypes)}
                </div>
                <div id="offensive-analysis" class="analysis-section">
                    <h3>Offensive Analysis</h3>
                    ${getOffensiveAnalysisHTML(offensiveTypes)}
                </div>
                <div id="wall-analysis" class="analysis-section">
                    <h3>Problematic Combinations</h3>
                    ${getWallAnalysisHTML(offensiveTypes)}
                </div>
            </div>`;
        resultsSection.style.display = 'block';
    }

    function getDefensiveAnalysisHTML(defensiveTypes) {
        const matchups = { 'x4': [], 'x2': [], 'x0.5': [], 'x0.25': [], 'x0': [] };
        types.forEach(attackingType => {
            let multiplier = 1;
            defensiveTypes.forEach(defendingType => {
                multiplier *= (typeChart[defendingType]?.[attackingType] ?? 1);
            });
            if (multiplier === 4) matchups['x4'].push(attackingType);
            else if (multiplier === 2) matchups['x2'].push(attackingType);
            else if (multiplier === 0.5) matchups['x0.5'].push(attackingType);
            else if (multiplier === 0.25) matchups['x0.25'].push(attackingType);
            else if (multiplier === 0) matchups['x0'].push(attackingType);
        });
        return `${createTypeSection('Weaknesses (x4)', matchups['x4'], 'x4')}
                ${createTypeSection('Weaknesses (x2)', matchups['x2'], 'x2')}
                ${createTypeSection('Resistances (x0.5)', matchups['x0.5'], 'x0-5')}
                ${createTypeSection('Resistances (x0.25)', matchups['x0.25'], 'x0-25')}
                ${createTypeSection('Immunities (x0)', matchups['x0'], 'x0')}`;
    }

    function getOffensiveAnalysisHTML(offensiveTypes) {
        const matchups = { 'x2': [], 'x1': [], 'x0.5': [], 'x0': [] };
        types.forEach(defendingType => {
            let bestMultiplier = -1;
            let bestTypeInfo = null;
            offensiveTypes.forEach(offense => {
                const multiplier = typeChart[offense.type]?.[defendingType] ?? 1;
                if (multiplier > bestMultiplier) {
                    bestMultiplier = multiplier;
                    bestTypeInfo = offense;
                }
            });
            const typeColor = typeColors[bestTypeInfo.type] || '#888';
            const targetHTML = `<span style="background: ${typeColor}; color: #fff; padding: 2px 6px; border-radius: 4px;">${bestTypeInfo.type} ${bestTypeInfo.tag}</span>`;

            if (bestMultiplier >= 2) matchups['x2'].push(targetHTML);
            else if (bestMultiplier === 1) matchups['x1'].push(targetHTML);
            else if (bestMultiplier > 0) matchups['x0.5'].push(targetHTML);
            else matchups['x0'].push(targetHTML);
        });
        return `${createTypeSection('Super Effective Against', matchups['x2'], 'x2')}
                ${createTypeSection('Neutral Damage Against', matchups['x1'], '')}
                ${createTypeSection('Not Very Effective Against', matchups['x0.5'], 'x0-5')}
                ${createTypeSection('No Effect Against', matchups['x0'], 'x0')}`;
    }

    function getWallAnalysisHTML(offensiveTypes) {
        const wallCombinations = [];
        const defensiveCombos = [];
        types.forEach(t1 => {
            defensiveCombos.push([t1]);
            types.forEach(t2 => { if (t1 < t2) defensiveCombos.push([t1, t2]); });
        });
        defensiveCombos.forEach(combo => {
            const isWall = offensiveTypes.every(offense => {
                let totalMultiplier = 1;
                combo.forEach(defensiveType => {
                    totalMultiplier *= (typeChart[defensiveType]?.[offense.type] ?? 1);
                });
                return totalMultiplier < 1;
            });
            if (isWall) wallCombinations.push(combo.join('/'));
        });
        return createTypeSection('Combinations Resisting Everything', wallCombinations, 'x0');
    }

    function createTypeSection(title, typeArray, className) {
        if (typeArray.length === 0) return '';
        const listItems = typeArray.map(item => {
            if (item.includes('<span')) {
                return `<li>${item}</li>`;
            }
            const typeNames = item.split('/');
            let background;
            if (typeNames.length === 1) {
                background = typeColors[typeNames[0]] || '#888';
            } else {
                const colors = typeNames.map(t => typeColors[t] || '#888');
                background = `linear-gradient(90deg, ${colors.join(', ')})`;
            }
            return `<li style="background: ${background}; color: #fff; text-shadow: 1px 1px 2px #000;">${item}</li>`;
        }).join('');
        const titleColor = titleColors[className] || '#000';
        return `<div class="offense-category"><h4 style="color:${titleColor}">${title}:</h4><ul class="type-list">${listItems}</ul></div>`;
    }

    populateSelectors();
});
